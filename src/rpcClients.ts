import { Chain, createPublicClient, http, type PublicClient } from "viem";
import {
  arbitrum,
  arbitrumGoerli,
  base,
  bsc,
  bscTestnet,
  linea,
  lineaTestnet,
  optimism,
  polygon,
  polygonMumbai,
  scrollSepolia,
  scroll,
  mainnet,
  goerli,
  optimismSepolia,
  mantle,
  mantaTestnet,
  baseSepolia,
} from "viem/chains";

export const opBnbMainnet = {
  id: 204,
  name: "opBNB",
  network: "opBNB",
  rpcUrls: {
    public: {
      http: [
        "https://opbnb-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3",
      ],
    },
    default: {
      http: [
        `https://opbnb-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3`,
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BlockScout",
      url: "https://opbnbscan.com",
    },
  },
  nativeCurrency: bsc.nativeCurrency,
};

export const opBnbTestnet = {
  id: 5611,
  name: "opBNB Testnet",
  network: "opBNB testnet",
  rpcUrls: {
    public: {
      http: [
        "https://opbnb-testnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3",
      ],
    },
    default: {
      http: [
        `https://opbnb-testnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3`,
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "BlockScout",
      url: "https://testnet.opbnbscan.com",
    },
  },
  nativeCurrency: bscTestnet.nativeCurrency,
};

const testnetChains = [
  optimismSepolia,
  polygonMumbai,
  lineaTestnet,
  arbitrumGoerli,
  opBnbTestnet,
  scrollSepolia,
  goerli,
  bscTestnet,
  mantle,
  baseSepolia,
];
const mainnetChains = [
  optimism,
  polygon,
  base,
  linea,
  arbitrum,
  opBnbMainnet,
  mainnet,
  scroll,
  bsc,
  mantaTestnet,
];

const supportedChains: Chain[] = [...testnetChains, ...mainnetChains];

const publicClients: Record<string, (url?: string) => PublicClient> =
  supportedChains.reduce(
    (clients, chain) => ({
      [chain.id]: (url?: string) =>
        createPublicClient({
          chain,
          transport: http(url, { retryCount: 0 }),
        }),
      ...clients,
    }),
    {},
  );

export { publicClients, supportedChains };
