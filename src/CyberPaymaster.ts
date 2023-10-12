import {
  createClient,
  type Address,
  type Hash,
  custom,
  type CustomTransport,
  RpcRequestError,
  type PublicClient,
  BaseError,
  createWalletClient,
  ChainDoesNotSupportContract,
} from "viem";
import { mainnet } from "viem/chains";
import type {
  PaymasterClient,
  PaymasterContext,
  EstimatedPaymasterData,
  SponsoredPaymasterData,
  TopUpContractRequest,
} from "./types";
import { TokenReceiverAbi } from "./ABIs";
import CyberAccount from "./CyberAccount";
import { supportedChains } from "./rpcClients";

type Params = {
  appId: string;
  rpcUrl: string;
  generateJwt: (cyberAccountAddress: Address) => Promise<string>;
};

class CyberPaymaster {
  public appId: string;
  public rpcUrl: string;
  private clients: Record<number, PaymasterClient<CustomTransport>>;
  public generateJwt: (cyberAccountAddress: Address) => Promise<string>;
  public jwt?: string;
  public publicClients: Record<number, PublicClient>;
  public cyberAccounts: Record<number, CyberAccount>;
  static testnetTokenReceiverAddress: Address =
    "0xcd97405fb58e94954e825e46db192b916a45d412";
  static mainnetTokenReceiverAddress: Address =
    "0xcd97405fb58e94954e825e46db192b916a45d412";

  static needAuthMethods = [
    "cc_sponsorUserOperation",
    "cc_rejectUserOperation",
  ];

  constructor({ appId, rpcUrl, generateJwt }: Params) {
    this.appId = appId;
    this.rpcUrl = rpcUrl;
    this.generateJwt = generateJwt;
    this.clients = {};
    this.publicClients = {};
    this.cyberAccounts = {};
  }

  public connect(cyberAccount: CyberAccount) {
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
              jwt = await self.generateJwt(cyberAccount.address);
              self.jwt = jwt;
            }

            auth = { Authorization: `Bearer ${jwt}` };
          }

          const requestBody = {
            method,
            params,
            id: id++,
            jsonrpc: "2.0",
          };

          const response = await fetch(
            `${self.rpcUrl}?chainId=${cyberAccount.chain.id}&appId=${self.appId}`,
            {
              method: "POST",
              body: JSON.stringify(requestBody),
              headers: auth,
            },
          );

          const res = await response.json();
          if (res.error) {
            const rpcRequestError = new RpcRequestError({
              body: requestBody,
              url: response.url,
              error: res.error,
            });

            throw rpcRequestError;
          }

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
        context: PaymasterContext,
      ) {
        return client.request({
          method: "cc_estimateUserOperation",
          params: [data, context],
        });
      },
      async sponsorUserOperation(
        data: SponsoredPaymasterData,
        context: PaymasterContext,
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

    this.clients[cyberAccount.chain.id] = client;
    this.publicClients[cyberAccount.chain.id] = cyberAccount.publicClient;
    this.cyberAccounts[cyberAccount.chain.id] = cyberAccount;

    return this;
  }

  async getUserCredit(address: Address, chainId: number) {
    return this.clients[chainId]?.getUserCredit(address);
  }

  async estimateUserOperation(
    data: EstimatedPaymasterData,
    context: PaymasterContext,
    chainId: number,
  ) {
    return this.clients[chainId]?.estimateUserOperation(data, context);
  }

  async sponsorUserOperation(
    data: SponsoredPaymasterData,
    context: PaymasterContext,
    chainId: number,
  ) {
    return this.clients[chainId]?.sponsorUserOperation(data, context);
  }

  async rejectUserOperation(hash: Hash, chainId: number) {
    return this.clients[chainId]?.rejectUserOperation(hash);
  }

  async listPendingUserOperations(address: Address, chainId: number) {
    return await this.clients[chainId]
      ?.listPendingUserOperations(address)
      .then((res) => res.userOperations);
  }

  public async topUp({
    sender,
    amount,
    chainId,
    to,
    writeContract,
  }: {
    sender?: Address;
    amount: bigint;
    chainId: number;
    to?: Address;
    writeContract?: (request: TopUpContractRequest) => Promise<Hash>;
  }) {
    const chain = supportedChains.find((chain) => chain.id === chainId);
    const cyberAccount = this.cyberAccounts[chainId];

    if (!chain) {
      throw new ChainDoesNotSupportContract({
        //@ts-ignore
        chain: {
          //@ts-ignore
          name: chainId.toString(),
        },
        contract: { name: "CyberPaymaster Token Receiver" },
      });
    }

    if (!cyberAccount) {
      throw new BaseError(`CyberAccount not found on ${chain.name}.`, {
        details: `CyberAccount is not found on ${chain.name}, make sure to create a CyberAccount on this chain with the right CyberPaymaster instance.`,
      });
    }

    const walletClient = createWalletClient({
      chain,
      // @ts-ignore
      transport: custom(globalThis.ethereum),
    });

    const { request } = await this.publicClients[chain.id]?.simulateContract({
      account: sender || cyberAccount?.owner.address,
      address: chain.testnet
        ? CyberPaymaster.testnetTokenReceiverAddress
        : CyberPaymaster.mainnetTokenReceiverAddress,
      abi: TokenReceiverAbi,
      functionName: "depositTo",
      args: [to || cyberAccount?.address],
      value: amount,
    });

    if (writeContract) {
      return await writeContract(request);
    }

    return await walletClient.writeContract(request);
  }
}

export default CyberPaymaster;
