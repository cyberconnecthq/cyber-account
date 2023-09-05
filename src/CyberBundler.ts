import { http, createClient, type Hash, type Address, type Chain } from "viem";
import { mainnet } from "viem/chains";
import type { BundlerClient, UserOperation } from "./types";

class CyberBundler {
  private clients: Record<number, BundlerClient>;
  public rpcUrl: string;
  public appId: string;

  static entryPointAddress: Address =
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  constructor({ rpcUrl, appId }: { rpcUrl: string; appId: string }) {
    this.rpcUrl = rpcUrl;
    this.appId = appId;
    this.clients = {};
  }

  public connect(chainId: number) {
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
      async getSupportedEntryPoints() {
        return (client as BundlerClient).request({
          method: "eth_supportedEntryPoints",
          params: [],
        });
      },
    }));

    this.clients[chainId] = client;

    return this;
  }

  public async getUserOperationByHash(hash: Hash, chainId: number) {
    return this.clients[chainId]?.getUserOperationByHash(hash);
  }

  public async getUserOperationReceipt(hash: Hash, chainId: number) {
    return this.clients[chainId]?.getUserOperationReceipt(hash);
  }

  public async sendUserOperation(
    userOperation: UserOperation,
    entryPointAddress: Address,
    chainId: number
  ) {
    return this.clients[chainId]?.sendUserOperation(
      userOperation,
      entryPointAddress
    );
  }

  public async estimateUserOperationGas(
    userOperation: UserOperation,
    entryPointAddress: Address,
    chainId: number
  ) {
    return this.clients[chainId]?.estimateUserOperationGas(
      userOperation,
      entryPointAddress
    );
  }

  public async getSupportedEntryPoints(chainId: number) {
    return this.clients[chainId]?.getSupportedEntryPoints();
  }
}

export default CyberBundler;
