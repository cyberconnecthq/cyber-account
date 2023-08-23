import { type Address, type Hex } from "viem";

export type Mode = "production" | "development";

export type UserOperation = {
  sender: Address;
  nonce: number;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
};
