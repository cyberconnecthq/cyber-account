import type {
  Address,
  Hash,
  Hex,
  Client,
  HttpTransport,
  Chain,
  Account,
  TransactionReceipt,
  Log,
} from "viem";

export type UserOperation = {
  sender: Address;
  nonce: Hex;
  initCode: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
  signature: Hex;
};

export type UserOperationCallData = {
  to: Address;
  data: Hex;
  value?: bigint;
};

export type CyberAccountOwner = {
  address: Address;
  signMessage: (message: Hex) => Promise<Hex>;
};

export type EstimatedGasValues = {
  preVerificationGas: Hex;
  verificationGasLimit: Hex;
  callGasLimit: Hex;
};

export type BundlerRpcRequest = [
  {
    Method: "eth_sendUserOperation";
    Parameters: [UserOperation, Address];
    ReturnType: Hash;
  },
  {
    Method: "eth_estimateUserOperationGas";
    Parameters: [UserOperation, Address];
    ReturnType: EstimatedGasValues;
  },
  {
    Method: "eth_getUserOperationByHash";
    Parameters: [Hash];
    ReturnType: UserOperation;
  },
  {
    Method: "eth_getUserOperationReceipt";
    Parameters: [Hash];
    ReturnType: UserOperationReceipt;
  },
  {
    Method: "eth_supportedEntryPoints";
    Parameters: [];
    ReturnType: Address[];
  }
];

export type UserOperationReceipt = {
  userOpHash: Hash;
  entryPoint: Address;
  sender: Address;
  nonce: Hex;
  paymaster: Address;
  actualGasCost: Hex;
  actualGasUsed: Hex;
  success: boolean;
  reason: string;
  logs: Log[];
  receipt: TransactionReceipt;
};

export type Estimation = {
  preVerificationGas: Hex;
  verificationGasLimit: Hex;
  callGasLimit: Hex;
};

export type BundlerActions = {
  estimateUserOperationGas: (
    userOperation: UserOperation,
    entryPoint: Address
  ) => Promise<Estimation>;
  sendUserOperation: (
    userOperation: UserOperation,
    entryPoint: Address
  ) => Promise<Hash>;
  getUserOperationByHash: (hash: Hash) => Promise<OnChainUserOperation | null>;
  getUserOperationReceipt: (hash: Hash) => Promise<UserOperationReceipt | null>;
  getSupportedEntryPoints: () => Promise<Address[]>;
};

export type BundlerClient = Client<
  HttpTransport,
  Chain,
  Account | undefined,
  BundlerRpcRequest,
  BundlerActions
>;

export type OnChainUserOperation = UserOperation & {
  blockHash: Hash;
  blockNumber: Hex;
  entryPoint: Address;
  transactionHash: Hash;
};
