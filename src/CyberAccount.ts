import {
  type Address,
  type Chain,
  concat,
  encodeFunctionData,
  type Hex,
  type PublicClient,
  type Hash,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  createWalletClient,
  custom,
  toHex,
  hexToBigInt,
} from "viem";
import { mainnet } from "viem/chains";
import CyberFactory from "./CyberFactory";
import CyberBundler from "./CyberBundler";
import { publicClients } from "./rpcClient";
import {
  type UserOperation,
  type UserOperationCallData,
  type CyberAccountOwner,
  type SmartAccount,
} from "./types";
import { EntryPointAbi, KernelAccountAbi } from "./ABIs";

interface CyberAccountParams {
  owner: CyberAccountOwner;
  chain: Chain;
  bundler: CyberBundler;
}

type Options = {};

const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

class CyberAccount {
  bundler: CyberBundler;
  owner: CyberAccountOwner;
  chain: Chain;
  cyberFactory: CyberFactory;
  rpcClient: PublicClient;
  smartAccount: SmartAccount;
  // It may support multiple validation modes in the future.
  // https://docs.zerodev.app/extend-wallets/overview#validation-phase

  static validationModes: Record<string, Hex> = {
    sudo: "0x00000000",
  };

  constructor(params: CyberAccountParams, options?: Options) {
    const { chain, owner, bundler } = params;
    this.chain = chain;
    this.owner = owner;
    this.cyberFactory = new CyberFactory({
      ownerAddress: this.owner.address,
      chain,
    });
    this.smartAccount = {
      address: this.cyberFactory.getContractAccountAddress(),
    };
    this.rpcClient = this.getRpcClient(chain.id);
    this.bundler = bundler.connect(chain.id);
  }

  getRpcClient(chainId: number): PublicClient {
    const rpcClient = publicClients[chainId];

    if (!rpcClient) {
      throw new Error(`No RPC client found for chain ${chainId}`);
    }

    return rpcClient;
  }

  async isAccountDeployed(chainId?: number) {
    if (this.smartAccount.isDeployed !== undefined) {
      return this.smartAccount.isDeployed;
    }

    let rpcClient = this.rpcClient;

    if (chainId) {
      rpcClient = this.getRpcClient(chainId);
    }

    const byteCode = await rpcClient.getBytecode({
      address: this.smartAccount.address,
    });

    const isDeployed = !!byteCode && byteCode !== "0x";

    this.smartAccount.isDeployed = isDeployed;

    return isDeployed;
  }

  async getAccountInitCode() {
    if (this.smartAccount.initCode !== undefined) {
      return this.smartAccount.initCode;
    }

    const isDeployed = await this.isAccountDeployed();

    if (isDeployed) {
      return "0x";
    }

    const initCode = concat([
      this.cyberFactory.contractAddresses.factory,
      this.cyberFactory.getFactoryInitCode(),
    ]);

    this.smartAccount.initCode = initCode;

    return initCode;
  }

  encodeSignature(signature: Hex) {
    return concat([CyberAccount.validationModes.sudo, signature]);
  }

  encodeExecuteCallData(callData: UserOperationCallData) {
    const { to, value, data } = callData;

    if (!to || !data) {
      // TODO: implement Error class
      throw new Error("to and data must not be empty.");
    }

    return encodeFunctionData({
      abi: KernelAccountAbi,
      functionName: "execute",
      args: [to, value || BigInt(0), data, 0],
    });
  }

  async sendTransaction(
    transactionData: UserOperationCallData
  ): Promise<Hash | undefined> {
    const sender = this.smartAccount.address;

    const values = await Promise.all([
      this.getUserOperationNonce(),
      this.getAccountInitCode(),
    ]);

    const nonce = toHex(values[0]);
    const initCode = values[1];

    const callData = this.encodeExecuteCallData(transactionData);
    const callGasLimit = "0x0";
    const verificationGasLimit = "0x0";
    const preVerificationGas = "0x0";
    const paymasterAndData =
      "0xC03Aac639Bb21233e0139381970328dB8bcEeB67fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    const signature =
      "0x00000000870fe151d548a1c527c3804866fab30abf28ed17b79d5fc5149f19ca0819fefc3c57f3da4fdf9b10fab3f2f3dca536467ae44943b9dbb8433efe7760ddd72aaa1c";

    const { maxFeePerGas = 0n, maxPriorityFeePerGas = 0n } =
      await this.rpcClient.estimateFeesPerGas();

    let draftedUserOperation: UserOperation = {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas: toHex(maxFeePerGas * 200n),
      maxPriorityFeePerGas: toHex(maxPriorityFeePerGas * 200n),
      paymasterAndData,
      signature,
    };

    const estimatedGasValues = await this.bundler.estimateUserOperationGas(
      draftedUserOperation,
      ENTRY_POINT_ADDRESS
    );

    //@ts-ignore
    draftedUserOperation = { ...draftedUserOperation, ...estimatedGasValues };

    const userOperationHash = this.getUserOperationHash({
      ...draftedUserOperation,
      paymasterAndData: "0x",
    });

    const rawSignature = await this.owner.signMessage(userOperationHash);
    const ecdsaSignature = this.addValidatorToSignature(rawSignature);

    const signedUserOperation = {
      ...draftedUserOperation,
      paymasterAndData: "0x" as Hex,
      signature: ecdsaSignature,
    };

    return await this.bundler.sendUserOperation(
      signedUserOperation,
      ENTRY_POINT_ADDRESS
    );
  }

  async getUserOperationNonce() {
    const nonce = await this.rpcClient.readContract({
      address: ENTRY_POINT_ADDRESS,
      abi: EntryPointAbi,
      functionName: "getNonce",
      args: [this.smartAccount.address, BigInt(0)],
    });

    return nonce;
  }

  getUserOperationHash(userOperation: UserOperation) {
    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
    } = userOperation;

    const packed = encodeAbiParameters(
      parseAbiParameters(
        "address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32"
      ),
      [
        sender,
        hexToBigInt(nonce),
        keccak256(initCode),
        keccak256(callData),
        hexToBigInt(callGasLimit),
        hexToBigInt(verificationGasLimit),
        hexToBigInt(preVerificationGas),
        hexToBigInt(maxFeePerGas),
        hexToBigInt(maxPriorityFeePerGas),
        keccak256(paymasterAndData),
      ]
    );

    const encoded = encodeAbiParameters(
      parseAbiParameters("bytes32, address, uint256"),
      [keccak256(packed), ENTRY_POINT_ADDRESS, BigInt(this.chain.id)]
    );

    return keccak256(encoded);
  }

  addValidatorToSignature(signature: Hex) {
    return concat([CyberAccount.validationModes.sudo, signature]);
  }
}

export default CyberAccount;
