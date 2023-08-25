import {
  createPublicClient,
  http,
  createClient,
  type Hash,
  type Client,
  type PublicClient,
  type HttpTransport,
  type Chain,
} from "viem";
import { mainnet, optimismGoerli, optimism, polygonMumbai } from "viem/chains";
import type { BundlerClient } from "./types";

// const bundlerClient: BundlerClient = createClient({
//   chain: mainnet,
//   transport: http(
//     "https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc?chainId=420&appId=ab23459a-32d7-4235-8129-77bd5de27fb1"
//   ),
// }).extend(() => ({
//   async getUserOperationByHash(hash: Hash) {
//     return bundlerClient.request({
//       method: "eth_getUserOperationByHash",
//       params: [hash],
//     });
//   },
//   async getUserOperationReceipt(hash: Hash) {
//     return bundlerClient.request({
//       method: "eth_getUserOperationReceipt",
//       params: [hash],
//     });
//   },
// }));
//
const mainnetPublicClient: PublicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const optimismGoerliPublicClient: PublicClient = createPublicClient<
  HttpTransport,
  Chain
>({
  chain: optimismGoerli,
  transport: http(),
});

const optimismPublicClient: PublicClient = createPublicClient<
  HttpTransport,
  Chain
>({
  chain: optimism,
  transport: http(),
});

const polygonMumbaiClient: PublicClient = createPublicClient<
  HttpTransport,
  Chain
>({
  chain: polygonMumbai,
  transport: http(),
});

const publicClients: Record<string, PublicClient> = {
  [mainnet.id]: mainnetPublicClient,
  [optimismGoerli.id]: optimismGoerliPublicClient,
  [optimism.id]: optimismPublicClient,
  [polygonMumbai.id]: polygonMumbaiClient,
};

export { publicClients };
