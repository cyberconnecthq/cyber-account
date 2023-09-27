import CyberAccount from "../CyberAccount";
import CyberBundler from "../CyberBundler";
import { optimismGoerli, polygonMumbai } from "viem/chains";
import { type UserOperation } from "../types";
import { type Hex } from "viem";

describe("CyberAccount", () => {
  it("returns the correct user operation hash", () => {
    const ownerAddress = "0x370CA01D7314e3EEa59d57E343323bB7e9De24C6";
    const userOperation: UserOperation = {
      callData:
        "0xb61d27f6000000000000000000000000b856dbd4fa1a79a46d426f537455e7d3e79ab7c4000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000",
      callGasLimit: "0x2f6c",
      initCode: "0x",
      maxFeePerGas: "0x59682f1e",
      maxPriorityFeePerGas: "0x59682f00",
      nonce: "0x1f",
      paymasterAndData: "0x",
      preVerificationGas: "0xa890",
      sender: "0xb856DBD4fA1A79a46D426f537455e7d3E79ab7c4",
      signature:
        "0xd16f93b584fbfdc03a5ee85914a1f29aa35c44fea5144c387ee1040a3c1678252bf323b7e9c3e9b4dfd91cca841fc522f4d3160a1e803f2bf14eb5fa037aae4a1b",
      verificationGasLimit: "0x114c2",
    };

    const userOperationHash =
      "0xa70d0af2ebb03a44dcd0714a8724f622e3ab876d0aa312f0ee04823285d6fb1b";

    const cyberBundler = new CyberBundler({
      rpcUrl: "https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc",
      appId: "ab23459a-32d7-4235-8129-77bd5de27fb1",
    });

    const cyberAccount = new CyberAccount({
      owner: {
        address: ownerAddress,
        signMessage: async (message) => {
          return ("0x" + message) as Hex;
        },
      },
      chain: polygonMumbai,
      bundler: cyberBundler,
    });

    expect(cyberAccount.hashUserOperation(userOperation)).toEqual(
      userOperationHash,
    );
  });
});
