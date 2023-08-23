import CyberFactory from "../CyberFactory";

describe("CyberFactory", () => {
  it("returns the correct CyberAccount address on the testnet", () => {
    const ownerAddress = "0xbd358966445e1089e3AdD528561719452fB78198";
    const cyberAccount = "0xe7d0368818f2A56c6EB2831FcF9b37Bb9504a745";

    const cyberFactory = new CyberFactory({
      ownerAddress,
      mode: "development",
    });

    const computedAddress = cyberFactory.getContractAccountAddress();

    expect(computedAddress).toBe(cyberAccount);
  });

  it("returns the correct CyberAccount address on the mainnet", () => {
    const ownerAddress = "0xbd358966445e1089e3AdD528561719452fB78198";
    const cyberAccount = "0x0e3fc76B722e43D0b20772E9BfBAc27a199dFE10";

    const cyberFactory = new CyberFactory({
      ownerAddress,
      mode: "production",
    });

    const computedAddress = cyberFactory.getContractAccountAddress();

    expect(computedAddress).toBe(cyberAccount);
  });
});
