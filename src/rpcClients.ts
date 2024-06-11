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

export const cyber = {
  id: 7560,
  name: "Cyber",
  network: "Cyber",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cyber.co"] },
    public: { http: ["https://rpc.cyber.co"] },
  },
  blockExplorers: {
    default: {
      name: "Cyber Mainnet Explorer",
      url: "https://cyberscan.co",
    },
  },
};

export const cyberTestnet = {
  id: 111557560,
  name: "Cyber Testnet",
  network: "Cyber Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.cyber.co"] },
    public: { http: ["https://rpc.testnet.cyber.co"] },
  },
  blockExplorers: {
    default: {
      name: "Cyber Testnet Explorer",
      url: "https://testnet.cyberscan.co/",
    },
  },
};

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
  cyberTestnet,
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
  cyber,
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
