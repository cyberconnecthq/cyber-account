import { http, createClient, type Hash, type Address, type Chain } from "viem";
import { mainnet } from "viem/chains";
import type { BundlerClient, UserOperation } from "./types";

class CyberBundler {
  client?: BundlerClient;
  rpcUrl: string;
  appId: string;

  constructor({ rpcUrl, appId }: { rpcUrl: string; appId: string }) {
    this.rpcUrl = rpcUrl;
    this.appId = appId;
  }

  connect(chainId: number) {
    const client: BundlerClient = createClient({
      chain: mainnet,
      transport: http(`${this.rpcUrl}?chainId=${chainId}&appId=${this.appId}`),
    }).extend(() => ({
      async sendUserOperation(
        userOperation: UserOperation,
        entryPointAddress: Address
      ) {
        return client.request({
          method: "eth_sendUserOperation",
          params: [userOperation, entryPointAddress],
        });
      },
      async estimateUserOperationGas(
        userOperation: UserOperation,
        entryPointAddress: Address
      ) {
        return (client as BundlerClient).request({
          method: "eth_estimateUserOperationGas",
          params: [userOperation, entryPointAddress],
        });
      },
      async getUserOperationByHash(hash: Hash) {
        return (client as BundlerClient).request({
          method: "eth_getUserOperationByHash",
          params: [hash],
        });
      },
      async getUserOperationReceipt(hash: Hash) {
        return (client as BundlerClient).request({
          method: "eth_getUserOperationReceipt",
          params: [hash],
        });
      },
    }));

    this.client = client;

    return this;
  }

  async getUserOperationByHash(hash: Hash) {
    return this.client?.getUserOperationByHash(hash);
  }

  async getUserOperationReceipt(hash: Hash) {
    return this.client?.getUserOperationReceipt(hash);
  }

  async sendUserOperation(
    userOperation: UserOperation,
    entryPointAddress: Address
  ) {
    return this.client?.sendUserOperation(userOperation, entryPointAddress);
  }

  async estimateUserOperationGas(
    userOperation: UserOperation,
    entryPointAddress: Address
  ) {
    return this.client?.estimateUserOperationGas(
      userOperation,
      entryPointAddress
    );
  }
}

export default CyberBundler;
