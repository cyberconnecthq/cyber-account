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
  toHex,
  hexToBigInt,
} from "viem";
import CyberFactory from "./CyberFactory";
import CyberBundler from "./CyberBundler";
import { publicClients } from "./rpcClients";
import {
  type UserOperation,
  type UserOperationCallData,
  type CyberAccountOwner,
} from "./types";
import { EntryPointAbi, KernelAccountAbi } from "./ABIs";

interface CyberAccountParams {
  owner: CyberAccountOwner;
  chain: Partial<Chain> & { id: Chain["id"]; rpcUrl?: string };
  bundler: CyberBundler;
}

class CyberAccount {
  public bundler: CyberBundler;
  public owner: CyberAccountOwner;
  public chain: Partial<Chain> & { id: Chain["id"]; rpcUrl?: string };
  public factory: CyberFactory;
  private publicClient: PublicClient;
  public address: Address;
  public isDeployed?: boolean;
  private initCode?: Hex;

  constructor(params: CyberAccountParams) {
    const { chain, owner, bundler } = params;
    this.chain = chain;
    this.owner = owner;
    this.factory = new CyberFactory({
      ownerAddress: this.owner.address,
      chain,
    });
    this.address = this.factory.calculateContractAccountAddress();
    this.publicClient = this.getRpcClient(chain);
    this.bundler = bundler.connect(chain.id);
  }

  private getRpcClient(
    chain: Partial<Chain> & { id: Chain["id"]; rpcUrl?: string }
  ): PublicClient {
    const publicClient = publicClients[chain.id];

    if (!publicClient) {
      throw new Error(`No RPC client found for chain ${chain.id}`);
    }

    return publicClient(chain.rpcUrl);
  }

  public async isAccountDeployed() {
    if (this.isDeployed !== undefined) {
      return this.isDeployed;
    }

    const byteCode = await this.publicClient.getBytecode({
      address: this.address,
    });

    const isDeployed = !!byteCode && byteCode !== "0x";

    this.isDeployed = isDeployed;

    return isDeployed;
  }

  public async getAccountInitCode() {
    if (this.initCode !== undefined) {
      return this.initCode;
    }

    const isDeployed = await this.isAccountDeployed();

    if (isDeployed) {
      return "0x";
    }

    const initCode = concat([
      this.factory.contractAddresses.factory,
      this.factory.getFactoryInitCode(),
    ]);

    this.initCode = initCode;

    return initCode;
  }

  private encodeExecuteCallData(callData: UserOperationCallData) {
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

  public async sendTransaction(
    transactionData: UserOperationCallData & {
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
    }
  ): Promise<Hash | undefined> {
    const sender = this.address;

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

    const { maxFeePerGas, maxPriorityFeePerGas } = await this.calculateGasFees(
      transactionData
    );

    let draftedUserOperation: UserOperation = {
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
      signature,
    };

    const estimatedGasValues = await this.bundler.estimateUserOperationGas(
      draftedUserOperation,
      CyberBundler.entryPointAddress
    );

    draftedUserOperation = { ...draftedUserOperation, ...estimatedGasValues };

    const userOperationHash = this.hashUserOperation({
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
      CyberBundler.entryPointAddress
    );
  }

  private async calculateGasFees(customizedFees?: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }) {
    const { maxFeePerGas, maxPriorityFeePerGas } = customizedFees || {};

    if (maxFeePerGas !== undefined && maxPriorityFeePerGas !== undefined) {
      return {
        maxFeePerGas: toHex(maxFeePerGas),
        maxPriorityFeePerGas: toHex(maxPriorityFeePerGas),
      };
    }

    const maxPriorityFeePerGasOnChain = hexToBigInt(
      await this.publicClient.request({
        method: "eth_maxPriorityFeePerGas",
      })
    );

    const maxPriorityFeePerGasWithBuffer =
      (maxPriorityFeePerGasOnChain * 125n) / 100n;

    const { baseFeePerGas } = await this.publicClient.getBlock();

    const baseFeePerGasWithBuffer = (baseFeePerGas || 0n) * 2n;

    const maxFeePerGasWithBuffer =
      baseFeePerGasWithBuffer + maxPriorityFeePerGasWithBuffer;

    return {
      maxFeePerGas: toHex(maxFeePerGasWithBuffer),
      maxPriorityFeePerGas: toHex(maxPriorityFeePerGasWithBuffer),
    };
  }

  private async getUserOperationNonce() {
    const nonce = await this.publicClient.readContract({
      address: CyberBundler.entryPointAddress,
      abi: EntryPointAbi,
      functionName: "getNonce",
      args: [this.address, BigInt(0)],
    });

    return nonce;
  }

  public hashUserOperation(userOperation: UserOperation) {
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
      [keccak256(packed), CyberBundler.entryPointAddress, BigInt(this.chain.id)]
    );

    return keccak256(encoded);
  }

  public getCallData(callData: UserOperationCallData) {
    return this.encodeExecuteCallData(callData);
  }

  public getSignature(rawSignature: Hex) {
    return this.addValidatorToSignature(rawSignature);
  }

  private addValidatorToSignature(signature: Hex) {
    return concat([CyberFactory.validationModes.sudo, signature]);
  }
}

export default CyberAccount;