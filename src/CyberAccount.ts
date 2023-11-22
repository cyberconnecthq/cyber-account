import {
  type Address,
  type Chain,
  concat,
  encodeFunctionData,
  decodeFunctionData,
  type Hex,
  type PublicClient,
  type Hash,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toHex,
  hexToBigInt,
  toBytes,
  fromBytes,
  encodePacked,
} from "viem";
import CyberFactory from "./CyberFactory";
import CyberBundler from "./CyberBundler";
import CyberPaymaster from "./CyberPaymaster";
import { publicClients } from "./rpcClients";
import {
  type UserOperation,
  type UserOperationCallData,
  type CyberAccountOwner,
  type TransactionData,
  type EstimateUserOperationReturn,
  type UserOperationCallDataWithDelegate,
  Estimation,
} from "./types";
import { EntryPointAbi, KernelAccountAbi, MultiSendAbi } from "./ABIs";

interface CyberAccountParams {
  owner: CyberAccountOwner;
  chain: Partial<Chain> & { id: Chain["id"]; rpcUrl?: string };
  bundler: CyberBundler;
  paymaster?: CyberPaymaster;
}

class CyberAccount {
  public bundler: CyberBundler;
  public owner: CyberAccountOwner;
  public chain: Partial<Chain> & { id: Chain["id"]; rpcUrl?: string };
  public factory: CyberFactory;
  public publicClient: PublicClient;
  public address: Address;
  public isDeployed?: boolean;
  private initCode?: Hex;
  public paymaster?: CyberPaymaster;

  static MULTI_SEND_ADDRESS: Hex = "0x8ae01fCF7c655655fF2c6Ef907b8B4718Ab4e17c";

  constructor(params: CyberAccountParams) {
    const { chain, owner, bundler, paymaster } = params;
    this.chain = chain;
    this.owner = owner;
    this.factory = new CyberFactory({
      ownerAddress: this.owner.address,
      chain,
    });
    this.address = this.factory.calculateContractAccountAddress();
    this.publicClient = this.getRpcClient(chain);
    this.bundler = bundler.connect(chain.id);
    this.paymaster = paymaster?.connect(this);
  }

  private getRpcClient(
    chain: Partial<Chain> & { id: Chain["id"]; rpcUrl?: string },
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

  public decodeTransactionCallData(data: Hex) {
    const { functionName, args } = decodeFunctionData({
      abi: KernelAccountAbi,
      data,
    });

    return { functionName, args };
  }

  private encodeExecuteCallData(
    callData: UserOperationCallData,
    opCode: number = 0,
  ) {
    const { to, value, data } = callData;

    if (!to || !data) {
      throw new Error("to and data must not be empty.");
    }

    return encodeFunctionData({
      abi: KernelAccountAbi,
      functionName: "execute",
      args: [to, value || BigInt(0), data, opCode],
    });
  }

  public encodeBatchExecuteCallData(batch: UserOperationCallData[]) {
    const multiSendCallData = encodeFunctionData({
      abi: MultiSendAbi,
      functionName: "multiSend",
      args: [this.encodeMultiSendCallData(batch)],
    });

    return this.encodeExecuteCallData(
      {
        to: CyberAccount.MULTI_SEND_ADDRESS,
        data: multiSendCallData,
      },
      1,
    );
  }

  private encodeMultiSendCallData(batch: UserOperationCallData[]) {
    return ("0x" + batch.map((tx) => this.encodeCall(tx)).join("")) as Hex;
  }

  private encodeCall(callData: UserOperationCallDataWithDelegate) {
    const data = toBytes(callData.data);
    const encoded = encodePacked(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [
        0, // nested delegate call 0 - false, 1 - true
        callData.to,
        callData.value || BigInt(0),
        BigInt(data.length),
        fromBytes(data, "hex"),
      ],
    );
    return encoded.slice(2);
  }

  public async sendTransaction(
    transactionData: TransactionData,
    {
      disablePaymaster = false,
      sponsorSig = "",
    }: { disablePaymaster?: boolean; sponsorSig?: string } = {},
  ): Promise<Hash | undefined> {
    if (this.paymaster && !disablePaymaster) {
      return await this.sendTransactionWithPaymaster(
        transactionData,
        sponsorSig,
      );
    }

    return await this.sendTransactionWithoutPaymaster(transactionData);
  }

  private async getDraftedUserOperation(
    transactionData: TransactionData,
  ): Promise<UserOperation> {
    let sender: Address;

    if (Array.isArray(transactionData)) {
      sender = this.address;
    } else {
      sender = transactionData.from || this.address;
    }

    const values = await Promise.all([
      this.getUserOperationNonce(),
      this.getAccountInitCode(),
    ]);

    const nonce = toHex(values[0]);
    const initCode = values[1];

    const callData = Array.isArray(transactionData)
      ? this.encodeBatchExecuteCallData(transactionData)
      : this.encodeExecuteCallData(transactionData);

    const callGasLimit = "0x0";
    const verificationGasLimit = "0x0";
    const preVerificationGas = "0x0";
    const paymasterAndData =
      "0xC03Aac639Bb21233e0139381970328dB8bcEeB67fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    const signature =
      "0x00000000870fe151d548a1c527c3804866fab30abf28ed17b79d5fc5149f19ca0819fefc3c57f3da4fdf9b10fab3f2f3dca536467ae44943b9dbb8433efe7760ddd72aaa1c";

    const { maxFeePerGas, maxPriorityFeePerGas } = Array.isArray(
      transactionData,
    )
      ? await this.calculateGasFees()
      : await this.calculateGasFees(transactionData);

    return {
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
  }

  public async sendTransactionWithoutPaymaster(
    transactionData: TransactionData,
  ): Promise<Hash | undefined> {
    let draftedUserOperation =
      await this.getDraftedUserOperation(transactionData);

    const estimatedGasValues = await this.bundler.estimateUserOperationGas(
      { ...draftedUserOperation, paymasterAndData: "0x" as Hex },
      CyberBundler.entryPointAddress,
      this.chain.id,
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
      CyberBundler.entryPointAddress,
      this.chain.id,
    );
  }

  public async sendTransactionWithPaymaster(
    transactionData: TransactionData,
    sponsorSig?: string,
  ): Promise<Hash | undefined> {
    if (Array.isArray(transactionData)) {
      return await this.sendBatchTransactionWithPaymaster(
        transactionData,
        sponsorSig,
      );
    }

    const nonce = null;

    let maxFeePerGas: Hex = "0x0";
    let maxPriorityFeePerGas: Hex = "0x0";

    const { from, to, value, data } = transactionData;
    const sender = from || this.address;

    if (to === undefined || value === undefined || data === undefined) {
      throw new Error("{to, value and data} must not be undefined");
    }

    if (transactionData.maxFeePerGas && transactionData.maxPriorityFeePerGas) {
      maxFeePerGas = toHex(transactionData.maxFeePerGas);
      maxPriorityFeePerGas = toHex(transactionData.maxPriorityFeePerGas);
    } else {
      const estimation = await this.paymaster!.estimateUserOperation(
        {
          sender,
          to: transactionData.to,
          value: value.toString(),
          callData: data,
          nonce: nonce,
          ep: CyberBundler.entryPointAddress,
          operation: 0,
        },
        {
          owner: this.owner.address,
          sponsorSig: sponsorSig || "",
        },
        this.chain.id,
      );

      maxFeePerGas = estimation?.maxFeePerGas || maxFeePerGas;
      maxPriorityFeePerGas =
        estimation?.maxPriorityFeePerGas || maxPriorityFeePerGas;
    }

    const sponsoredResult = await this.paymaster!.sponsorUserOperation(
      {
        sender,
        to: transactionData.to,
        value: value.toString(),
        callData: data,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        nonce: nonce,
        ep: CyberBundler.entryPointAddress,
        operation: 0,
      },
      { owner: this.owner.address, sponsorSig: sponsorSig || "" },
      this.chain.id,
    );

    let rawSignature: Hex;
    try {
      rawSignature = await this.owner.signMessage(
        sponsoredResult.userOperationHash,
      );
    } catch (e: unknown) {
      await this.paymaster?.rejectUserOperation(
        sponsoredResult.userOperationHash,
        this.chain.id,
      );

      throw e;
    }

    const ecdsaSignature = this.addValidatorToSignature(rawSignature);

    const signedUserOperation = {
      ...sponsoredResult.userOperation,
      signature: ecdsaSignature,
    };

    return await this.bundler.sendUserOperation(
      signedUserOperation,
      CyberBundler.entryPointAddress,
      this.chain.id,
    );
  }

  private sumBatchTxValues(transactionData: TransactionData) {
    if (!Array.isArray(transactionData)) {
      return transactionData.value || 0n;
    }

    return transactionData.reduce(
      (acc, tx) => acc + (tx.value || 0n),
      BigInt(0),
    );
  }

  private encodeMultiSendFunctionData(transactionData: TransactionData) {
    if (!Array.isArray(transactionData)) {
      return "0x";
    }

    return encodeFunctionData({
      abi: MultiSendAbi,
      functionName: "multiSend",
      args: [this.encodeMultiSendCallData(transactionData)],
    });
  }

  public async sendBatchTransactionWithPaymaster(
    transactionData: TransactionData,
    sponsorSig?: string,
  ): Promise<Hash | undefined> {
    if (!Array.isArray(transactionData)) {
      return;
    }

    const nonce = null;
    const sender = this.address;
    const value = this.sumBatchTxValues(transactionData).toString();
    const callData = this.encodeMultiSendFunctionData(transactionData);
    const operation = 1;
    const to = CyberAccount.MULTI_SEND_ADDRESS;
    const ep = CyberBundler.entryPointAddress;

    let maxFeePerGas: Hex = "0x0";
    let maxPriorityFeePerGas: Hex = "0x0";

    const estimation = await this.paymaster!.estimateUserOperation(
      {
        sender,
        to,
        value,
        callData,
        nonce,
        ep,
        operation,
      },
      { owner: this.owner.address, sponsorSig: sponsorSig || "" },
      this.chain.id,
    );

    maxFeePerGas = estimation?.maxFeePerGas || maxFeePerGas;
    maxPriorityFeePerGas =
      estimation?.maxPriorityFeePerGas || maxPriorityFeePerGas;

    const sponsoredResult = await this.paymaster!.sponsorUserOperation(
      {
        sender,
        to,
        value,
        callData,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        ep,
        operation,
      },
      {
        owner: this.owner.address,
        sponsorSig: sponsorSig || "",
      },
      this.chain.id,
    );

    let rawSignature: Hex;
    try {
      rawSignature = await this.owner.signMessage(
        sponsoredResult.userOperationHash,
      );
    } catch (e: unknown) {
      await this.paymaster?.rejectUserOperation(
        sponsoredResult.userOperationHash,
        this.chain.id,
      );

      throw e;
    }

    const ecdsaSignature = this.addValidatorToSignature(rawSignature);

    const signedUserOperation = {
      ...sponsoredResult.userOperation,
      signature: ecdsaSignature,
    };

    return await this.bundler.sendUserOperation(
      signedUserOperation,
      CyberBundler.entryPointAddress,
      this.chain.id,
    );
  }

  public async estimateTransaction(
    transactionData: TransactionData,
    {
      disablePaymaster = false,
      sponsorSig = "",
    }: { disablePaymaster?: boolean; sponsorSig?: string } = {},
  ): Promise<EstimateUserOperationReturn | Estimation | undefined> {
    if (this.paymaster && !disablePaymaster) {
      return await this.estimateTransactionWithPaymaster(
        transactionData,
        sponsorSig,
      );
    }

    return await this.estimateTransactionWithoutPaymaster(transactionData);
  }

  public async estimateTransactionWithPaymaster(
    transactionData: TransactionData,
    sponsorSig?: string,
  ): Promise<EstimateUserOperationReturn | undefined> {
    if (Array.isArray(transactionData)) {
      return await this.estimateBatchTransactionWithPaymaster(
        transactionData,
        sponsorSig,
      );
    }

    const nonce = null;

    const { from, to, value, data } = transactionData;
    if (to === undefined || value === undefined || data === undefined) {
      throw new Error("{to, value and data} must not be undefined.");
    }

    const estimation = await this.paymaster?.estimateUserOperation(
      {
        sender: from || this.address,
        to: transactionData.to,
        value: value.toString(),
        callData: data,
        nonce: nonce,
        ep: CyberBundler.entryPointAddress,
        operation: 0,
      },
      { owner: this.owner.address, sponsorSig },
      this.chain.id,
    );

    return estimation;
  }

  public async estimateBatchTransactionWithPaymaster(
    transactionData: TransactionData,
    sponsorSig?: string,
  ): Promise<EstimateUserOperationReturn | undefined> {
    if (!Array.isArray(transactionData)) {
      return;
    }

    const nonce = null;
    const sender = this.address;
    const to = CyberAccount.MULTI_SEND_ADDRESS;
    const value = this.sumBatchTxValues(transactionData).toString();
    const callData = this.encodeBatchExecuteCallData(transactionData);

    const estimation = await this.paymaster?.estimateUserOperation(
      {
        sender,
        to: to,
        value,
        callData,
        nonce,
        ep: CyberBundler.entryPointAddress,
        operation: 1,
      },
      {
        owner: this.owner.address,
        sponsorSig: sponsorSig || "",
      },
      this.chain.id,
    );

    return estimation;
  }

  public async estimateTransactionWithoutPaymaster(
    transactionData: TransactionData,
  ): Promise<Estimation | undefined> {
    let draftedUserOperation =
      await this.getDraftedUserOperation(transactionData);

    const estimatedGasValues = await this.bundler.estimateUserOperationGas(
      draftedUserOperation,
      CyberBundler.entryPointAddress,
      this.chain.id,
    );

    return estimatedGasValues;
  }

  private async calculateGasFees(customizedFees?: {
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
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
      }),
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
    const appIdHex = ("0x" + this.bundler.appId.split("-").join("")) as Hex;

    const nonce = await this.publicClient.readContract({
      address: CyberBundler.entryPointAddress,
      abi: EntryPointAbi,
      functionName: "getNonce",
      args: [this.address, hexToBigInt(appIdHex)],
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
        "address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32",
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
      ],
    );

    const encoded = encodeAbiParameters(
      parseAbiParameters("bytes32, address, uint256"),
      [
        keccak256(packed),
        CyberBundler.entryPointAddress,
        BigInt(this.chain.id),
      ],
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
