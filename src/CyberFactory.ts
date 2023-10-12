import {
  type Address,
  type Hex,
  type Chain,
  keccak256,
  concat,
  bytesToHex,
  hexToBytes,
  getContractAddress,
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
} from "viem";
import { KernelFactoryAbi } from "./ABIs";

class CyberFactory {
  public ownerAddress: Address;
  public chain: Partial<Chain> & { id: Chain["id"] };
  public contractAddresses: Record<string, Address>;

  // It may support multiple validation modes in the future.
  // https://docs.zerodev.app/extend-wallets/overview#validation-phase
  static validationModes: Record<string, Hex> = {
    sudo: "0x00000000",
  };

  static testnetContractAddresses: Record<string, Address> = {
    factory: "0xaee9762ce625e0a8f7b184670fb57c37bfe1d0f1",
    validator: "0x417f5a41305ddc99d18b5e176521b468b2a31b86",
    kernelTemplate: "0x19f4147568D76B8a68b3755589eCd09A6B97acB7",
    nextTemplate: "0x7939a966331af83551C2b1F8753Cd1aa76C85F5c",
  };

  static mainnetContractAddresses: Record<string, Address> = {
    factory: "0xaee9762ce625e0a8f7b184670fb57c37bfe1d0f1",
    validator: "0x417f5a41305ddc99d18b5e176521b468b2a31b86",
    kernelTemplate: "0x19f4147568D76B8a68b3755589eCd09A6B97acB7",
    nextTemplate: "0x7939a966331af83551C2b1F8753Cd1aa76C85F5c",
  };

  constructor({
    ownerAddress,
    chain,
  }: {
    ownerAddress: Address;
    chain: Partial<Chain> & { id: Chain["id"] };
  }) {
    if (!chain) {
      throw new Error("Chain must be specified.");
    }

    this.ownerAddress = ownerAddress;
    this.chain = chain;
    this.contractAddresses = chain.testnet
      ? CyberFactory.testnetContractAddresses
      : CyberFactory.mainnetContractAddresses;
  }

  private getSalt = (): Hex => {
    let saltBytes = concat([
      Buffer.from([]),
      hexToBytes(this.contractAddresses.validator),
      hexToBytes(this.ownerAddress),
      hexToBytes(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ),
    ]);

    return keccak256(saltBytes) as Hex;
  };

  private getByteCode = (): Hex => {
    const creationCode = hexToBytes(
      "0x608060405260405161034a38038061034a833981016040819052610022916101ca565b6001600160a01b0382166100965760405162461bcd60e51b815260206004820152603060248201527f4549503139363750726f78793a20696d706c656d656e746174696f6e2069732060448201526f746865207a65726f206164647265737360801b60648201526084015b60405180910390fd5b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc82815581511561017c576000836001600160a01b0316836040516100db9190610298565b600060405180830381855af49150503d8060008114610116576040519150601f19603f3d011682016040523d82523d6000602084013e61011b565b606091505b505090508061017a5760405162461bcd60e51b815260206004820152602560248201527f4549503139363750726f78793a20636f6e7374727563746f722063616c6c2066604482015264185a5b195960da1b606482015260840161008d565b505b5050506102b4565b634e487b7160e01b600052604160045260246000fd5b60005b838110156101b557818101518382015260200161019d565b838111156101c4576000848401525b50505050565b600080604083850312156101dd57600080fd5b82516001600160a01b03811681146101f457600080fd5b60208401519092506001600160401b038082111561021157600080fd5b818501915085601f83011261022557600080fd5b81518181111561023757610237610184565b604051601f8201601f19908116603f0116810190838211818310171561025f5761025f610184565b8160405282815288602084870101111561027857600080fd5b61028983602083016020880161019a565b80955050505050509250929050565b600082516102aa81846020870161019a565b9190910192915050565b6088806102c26000396000f3fe60806040526000602d7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc5490565b90503660008037600080366000845af43d6000803e808015604d573d6000f35b3d6000fdfea2646970667358221220f2239e345a4d03f495719bd5d13f603839ac7a04ce61c9938029e0909f0ff48964736f6c634300080e0033",
    );

    const encodeCallBytesPrefix = hexToBytes("0xcf7a1d77");
    const encodeCallBytesPostfix = encodeAbiParameters(
      parseAbiParameters("address, address, bytes"),
      [
        this.contractAddresses.validator,
        this.contractAddresses.nextTemplate,
        this.ownerAddress,
      ],
    );

    const encodeCallBytes = concat([
      encodeCallBytesPrefix,
      hexToBytes(encodeCallBytesPostfix),
    ]) as Uint8Array;

    const encodeBytes = encodeAbiParameters(
      parseAbiParameters("address, bytes"),
      [this.contractAddresses.kernelTemplate, bytesToHex(encodeCallBytes)],
    );

    return bytesToHex(concat([creationCode, hexToBytes(encodeBytes)])) as Hex;
  };

  public calculateContractAccountAddress(): Address {
    const salt = this.getSalt();
    const from = this.contractAddresses.factory;
    const opcode = "CREATE2";
    const bytecode = this.getByteCode();

    return getContractAddress({ from, salt, opcode, bytecode });
  }

  public getFactoryInitCode() {
    return encodeFunctionData({
      abi: KernelFactoryAbi,
      functionName: "createAccount",
      args: [this.contractAddresses.validator, this.ownerAddress, BigInt(0)],
    });
  }
}

export default CyberFactory;
