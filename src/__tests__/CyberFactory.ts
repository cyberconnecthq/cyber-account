import CyberFactory from "../CyberFactory";
import { optimism, optimismGoerli } from "viem/chains";

describe("CyberFactory", () => {
  it("returns the correct CyberAccount address on the testnet", () => {
    const ownerAddress = "0xbd358966445e1089e3AdD528561719452fB78198";
    const cyberAccount = "0x0e3fc76B722e43D0b20772E9BfBAc27a199dFE10";

    const cyberFactory = new CyberFactory({
      ownerAddress,
      chain: optimismGoerli,
    });

    const computedAddress = cyberFactory.calculateContractAccountAddress();

    expect(computedAddress).toBe(cyberAccount);
  });

  it("returns the correct CyberAccount address on the mainnet", () => {
    const ownerAddress = "0xbd358966445e1089e3AdD528561719452fB78198";
    const cyberAccount = "0x0e3fc76B722e43D0b20772E9BfBAc27a199dFE10";

    const cyberFactory = new CyberFactory({
      ownerAddress,
      chain: optimism,
    });

    const computedAddress = cyberFactory.calculateContractAccountAddress();

    expect(computedAddress).toBe(cyberAccount);
  });
});
