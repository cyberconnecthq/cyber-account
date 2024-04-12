import { Chain, createPublicClient, http, type PublicClient } from "viem";
import {
  arbitrum,
  base,
  bsc,
  bscTestnet,
  linea,
  lineaTestnet,
  optimism,
  polygon,
  scrollSepolia,
  scroll,
  mainnet,
  optimismSepolia,
  mantle,
  mantleTestnet,
  baseSepolia,
  arbitrumSepolia,
  opBNB,
  opBNBTestnet,
} from "viem/chains";

export const polygonAmoy = {
  id: 80002,
  name: "Polygon Amoy",
  network: "Polygon Amoy",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    public: {
      http: ["https://rpc-amoy.polygon.technology/"],
    },
    default: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://www.oklink.com/amoy" },
  },
  testnet: true,
};

const testnetChains = [
  optimismSepolia,
  lineaTestnet,
  arbitrumSepolia,
  opBNBTestnet,
  scrollSepolia,
  bscTestnet,
  baseSepolia,
  polygonAmoy,
  mantleTestnet,
];

const mainnetChains = [
  optimism,
  polygon,
  base,
  linea,
  arbitrum,
  opBNB,
  mainnet,
  scroll,
  bsc,
  mantle,
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
