import {
  createClient,
  type Address,
  type Hash,
  custom,
  type CustomTransport,
} from "viem";
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
  generateJwt: (cyberAccountAddress: Address) => Promise<string>;
};

class CyberPaymaster {
  public appId: string;
  public rpcUrl: string;
  private client?: PaymasterClient<CustomTransport>;
  public generateJwt: (cyberAccountAddress: Address) => Promise<string>;
  public jwt?: string;
  static needAuthMethods = ["cc_sponsorUserOperation"];

  constructor({ appId, rpcUrl, generateJwt }: Params) {
    this.appId = appId;
    this.rpcUrl = rpcUrl;
    this.generateJwt = generateJwt;
  }

  public connect(chainId: number, cyberAccountAddress: Address) {
    const self = this;
    let id = 0;

    const client: PaymasterClient<CustomTransport> = createClient({
      chain: mainnet,
      transport: custom({
        async request({ method, params }) {
          let auth: { Authorization?: string } = {};

          if (CyberPaymaster.needAuthMethods.includes(method)) {
            let jwt: string;
            if (self.jwt) {
              jwt = self.jwt;
            } else {
              jwt = await self.generateJwt(cyberAccountAddress);
              self.jwt = jwt;
            }

            auth = { Authorization: `Bearer ${jwt}` };
          }

          const reponse = await fetch(
            `${self.rpcUrl}?chainId=${chainId}&appId=${self.appId}`,
            {
              method: "POST",
              body: JSON.stringify({
                method,
                params,
                id: id++,
                jsonrpc: "2.0",
              }),
              headers: auth,
            }
          );

          const res = await reponse.json();

          return res.result;
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
