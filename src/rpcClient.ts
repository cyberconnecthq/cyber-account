import {
  createPublicClient,
  http,
  type PublicClient,
  type HttpTransport,
  type Chain,
} from "viem";
import { mainnet, optimismGoerli, optimism } from "viem/chains";

const mainnetPublicClient: PublicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const optimismGoerliPublicClient: PublicClient<HttpTransport, Chain> =
  createPublicClient<HttpTransport, Chain>({
    chain: optimismGoerli,
    transport: http(),
  });

const optimismPublicClient: PublicClient<HttpTransport, Chain> =
  createPublicClient<HttpTransport, Chain>({
    chain: optimism,
    transport: http(),
  });

const publicClients: Record<string, PublicClient> = {
  [mainnet.id]: mainnetPublicClient,
  [optimismGoerli.id]: optimismGoerliPublicClient,
  [optimism.id]: optimismPublicClient,
};

export { publicClients };
