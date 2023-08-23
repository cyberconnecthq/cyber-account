import { type Address, type Chain, type PublicClient, concat } from "viem";
import CyberFactory from "./CyberFactory";
import { publicClients } from "./rpcClient";

interface CyberAccountParams {
  ownerAddress: Address;
  chain: Chain;
}

type Options = {};

class CyberAccount {
  chain: Chain;
  cyberFactory: CyberFactory;
  smartAccountAddress: Address;
  rpcClient: PublicClient;

  constructor(params: CyberAccountParams, options: Options) {
    const { ownerAddress, chain } = params;
    this.chain = chain;
    this.cyberFactory = new CyberFactory({ ownerAddress, chain });
    this.smartAccountAddress = this.cyberFactory.getContractAccountAddress();
    this.rpcClient = this.getRpcClient(chain.id);
  }

  getRpcClient(chainId: number): PublicClient {
    const rpcClient = publicClients[chainId];

    if (!rpcClient) {
      throw new Error(`No RPC client found for chain ${chainId}`);
    }

    return rpcClient;
  }

  async isAccountDeployed(chainId?: number) {
    let rpcClient = this.rpcClient;

    if (chainId) {
      rpcClient = this.getRpcClient(chainId);
    }

    const byteCode = await rpcClient.getBytecode({
      address: this.smartAccountAddress,
    });

    return !!byteCode && byteCode !== "0x";
  }

  async getAccountInitCode() {
    const isDeployed = await this.isAccountDeployed();

    if (isDeployed) {
      return "0x";
    }

    return concat([
      this.cyberFactory.contractAddresses.factory,
      this.cyberFactory.getFactoryInitCode(),
    ]);
  }
}

export default CyberAccount;
