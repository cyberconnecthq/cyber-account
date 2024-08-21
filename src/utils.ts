import CyberAccount, { CyberAccountParams } from "./CyberAccount";
import { testnetChains } from "./rpcClients";

function getRheaApiUrlByChainId(chainId: number) {
  const rheaApiUrl = testnetChains.find((_chain) => _chain.id === chainId)
    ? "https://api.stg.cyberconnect.dev/v3/"
    : "https://api.cyberconnect.dev/v3/";

  return rheaApiUrl;
}

async function getAllCyberAccounts(config: CyberAccountParams) {
  const { owner, chain, ...props } = config;
  const rheaApiUrl = getRheaApiUrlByChainId(chain.id);
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query:
        "query getOwnedCyberAccount($address:AddressEVM!,$chainId:ChainId!){wallet(address:$address,chainId:$chainId){id address chainId ... on GeneralWallet{cyberAccounts{edges{node{address}}}}}}",
      variables: {
        address: owner.address,
        chainId: chain.id,
      },
    }),
  };

  const res = await (await fetch(rheaApiUrl, options)).json();
  const cyberAccountAddresses = (res.data.wallet.cyberAccounts?.edges?.map(
    (edge: { node: { address: `0x${string}` } }) => edge.node.address,
  ) || []) as `0x${string}`[];
  return cyberAccountAddresses.map(
    (address) => new CyberAccount({ owner, address, chain, ...props }),
  );
}

export { getAllCyberAccounts, getRheaApiUrlByChainId };
