import {
  createPublicClient,
  http,
  type PublicClient,
  type WalletClient,
  createWalletClient,
  custom,
  Chain,
} from "viem";
import {
  optimismGoerli,
  optimism,
  polygonMumbai,
  polygon,
  base,
  baseGoerli,
  lineaTestnet,
  linea,
  arbitrumGoerli,
  arbitrum,
} from "viem/chains";

const testnetChains = [
  optimismGoerli,
  polygonMumbai,
  baseGoerli,
  lineaTestnet,
  arbitrumGoerli,
];
const mainnetChains = [optimism, polygon, base, linea, arbitrum];

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
    {}
  );

export { publicClients, supportedChains };
