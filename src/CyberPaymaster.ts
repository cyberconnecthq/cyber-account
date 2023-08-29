import { createClient, http, type Address, type Hash } from "viem";
import { mainnet } from "viem/chains";
import type {
  PaymasterClient,
  PaymasterContext,
  EstimatedPaymasterData,
  SponsoredPaymasterData,
} from "./types";

type Params = {
  appId: string;
  rpcUrl: string;
  jwt: string;
};

class CyberPaymaster {
  public appId: string;
  public rpcUrl: string;
  private jwt: string;
  private client?: PaymasterClient;

  constructor({ appId, rpcUrl, jwt }: Params) {
    this.appId = appId;
    this.rpcUrl = rpcUrl;
    this.jwt = jwt;
  }

  public connect(chainId: number) {
    const client: PaymasterClient = createClient({
      chain: mainnet,
      transport: http(`${this.rpcUrl}?chainId=${chainId}&appId=${this.appId}`, {
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${this.jwt}`,
          },
        },
      }),
    }).extend(() => ({
      async getUserCredit(address: Address) {
        return client.request({
          method: "cc_getUserCredit",
          params: [address],
        });
      },
      async estimateUserOperation(
        data: EstimatedPaymasterData,
        context: PaymasterContext
      ) {
        return client.request({
          method: "cc_estimateUserOperation",
          params: [data, context],
        });
      },
      async sponsorUserOperation(
        data: SponsoredPaymasterData,
        context: PaymasterContext
      ) {
        return client.request({
          method: "cc_sponsorUserOperation",
          params: [data, context],
        });
      },
      async rejectUserOperation(hash: Hash) {
        return client.request({
          method: "cc_rejectUserOperation",
          params: [hash],
        });
      },
      async listPendingUserOperations(address: Address) {
        return client.request({
          method: "cc_listPendingUserOperations",
          params: [address],
        });
      },
    }));

    this.client = client;

    return this;
  }

  async getUserCredit(address: Address) {
    return this.client?.getUserCredit(address);
  }

  async estimateUserOperation(
    data: EstimatedPaymasterData,
    context: PaymasterContext
  ) {
    return this.client?.estimateUserOperation(data, context);
  }

  async sponsorUserOperation(
    data: SponsoredPaymasterData,
    context: PaymasterContext
  ) {
    return this.client?.sponsorUserOperation(data, context);
  }

  async rejectUserOperation(hash: Hash) {
    return this.client?.rejectUserOperation(hash);
  }

  async listPendingUserOperations(address: Address) {
    return this.client?.listPendingUserOperations(address);
  }
}

export default CyberPaymaster;
