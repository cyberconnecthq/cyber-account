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
  Transport,
  WriteContractParameters,
} from "viem";
import { TokenReceiverAbi } from "./ABIs";

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

export type TransactionData =
  | (UserOperationCallData & {
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
    })
  | Array<
      UserOperationCallData & {
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
      }
    >;

export type UserOperationCallData = {
  from?: Address;
  to: Address;
  data: Hex;
  value?: bigint;
};

export type UserOperationCallDataWithDelegate = UserOperationCallData & {
  delegateCall?: boolean;
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

export type BundlerRpcRequests = [
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
  },
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
    entryPoint: Address,
  ) => Promise<Estimation>;
  sendUserOperation: (
    userOperation: UserOperation,
    entryPoint: Address,
  ) => Promise<Hash>;
  getUserOperationByHash: (hash: Hash) => Promise<OnChainUserOperation | null>;
  getUserOperationReceipt: (hash: Hash) => Promise<UserOperationReceipt | null>;
  getSupportedEntryPoints: () => Promise<Address[]>;
};

export type BundlerClient = Client<
  HttpTransport,
  Chain,
  Account | undefined,
  BundlerRpcRequests,
  BundlerActions
>;

export interface EstimatedPaymasterData {
  sender: Address;
  to: Address;
  callData: Hex;
  value: string;
  nonce: Hex | null;
  ep: Address;
  operation: 0 | 1; // 0 = call, 1 = delegate call
}

export interface SponsoredPaymasterData {
  sender: Address;
  to: Address;
  callData: Hex;
  value: string;
  nonce: Hex | null;
  ep: Address;
  maxFeePerGas?: Hex | null;
  maxPriorityFeePerGas?: Hex | null;
  operation: 0 | 1; // 0 = call, 1 = delegate call
}

export type PaymasterContext = {
  owner: Address;
  sponsorSig?: string;
};

export type EstimateUserOperationReturn = {
  totalGasLimit: Hex;
  totalGasFee: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  requiredCredit: Hex;
};

export type SponsorUserOperationReturn = {
  userOperation: UserOperation;
  userOperationHash: Hash;
  pmAndDataExpireAt: number;
  signBeforeAt: number;
  refundAt: number;
};

enum UserOperationStatus {
  Pending = "PENDING",
  PendingSign = "PENDING_SIGN",
  Rejected = "REJECTED",
  Success = "SUCCESS",
  Fail = "FAIL",
  NotExecuted = "NOT_EXECUTED",
}

export type PendingUserOperation = {
  userOperationHash: Hash;
  userOperation: UserOperation;
  chainId: number;
  credit: Hex;
  status: UserOperationStatus.Pending | UserOperationStatus.PendingSign;
  pmAndDataExpireAt: number;
  signBeforeAt: number;
  refundAt: number;
};

export type PaymasterRpcRequests = [
  {
    Method: "cc_getUserCredit";
    Parameters: [Address];
    ReturnType: { balance: Hex };
  },
  {
    Method: "cc_estimateUserOperation";
    Parameters: [EstimatedPaymasterData, PaymasterContext];
    ReturnType: EstimateUserOperationReturn;
  },
  {
    Method: "cc_sponsorUserOperation";
    Parameters: [SponsoredPaymasterData, PaymasterContext];
    ReturnType: SponsorUserOperationReturn;
  },
  {
    Method: "cc_rejectUserOperation";
    Parameters: [Hash];
    ReturnType: { success: boolean };
  },
  {
    Method: "cc_listPendingUserOperations";
    Parameters: [Address];
    ReturnType: { userOperations: PendingUserOperation[] };
  },
];

export type PaymasterActions = {
  getUserCredit: (address: Address) => Promise<Hex>;
  estimateUserOperation: (
    data: EstimatedPaymasterData,
    context: PaymasterContext,
  ) => Promise<EstimateUserOperationReturn>;
  sponsorUserOperation: (
    data: SponsoredPaymasterData,
    context: PaymasterContext,
  ) => Promise<SponsorUserOperationReturn>;
  rejectUserOperation: (hash: Hash) => Promise<{ success: boolean }>;
  listPendingUserOperations: (
    address: Address,
  ) => Promise<{ userOperations: PendingUserOperation[] }>;
};

export type PaymasterClient<T extends Transport = HttpTransport> = Client<
  T,
  Chain,
  Account | undefined,
  PaymasterRpcRequests,
  PaymasterActions
>;

export type OnChainUserOperation = {
  userOperation: UserOperation;
  blockHash: Hash;
  blockNumber: Hex;
  entryPoint: Address;
  transactionHash: Hash;
};

export type TopUpContractRequest = WriteContractParameters<
  typeof TokenReceiverAbi
>;
