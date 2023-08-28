import { createPublicClient, http, type PublicClient } from "viem";
import {
  optimismGoerli,
  optimism,
  polygonMumbai,
  polygon,
  base,
  baseGoerli,
  lineaTestnet,
  linea,
} from "viem/chains";

const testnetChains = [optimismGoerli, polygonMumbai, baseGoerli, lineaTestnet];
const mainnetChains = [optimism, polygon, base, linea];

const supportedChains = [...testnetChains, ...mainnetChains];

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

export { publicClients };
