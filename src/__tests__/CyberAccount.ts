import CyberAccount from "../CyberAccount";
import CyberBundler from "../CyberBundler";
import { polygonAmoy } from "../rpcClients";
import { type UserOperation } from "../types";
import { type Hex } from "viem";

describe("CyberAccount", () => {
  it("returns the correct user operation hash", () => {
    const ownerAddress = "0x370CA01D7314e3EEa59d57E343323bB7e9De24C6";
    const userOperation: UserOperation = {
      sender: "0x033b2F9e612B3d633537DAA93673bFB0D5Ef0F6A",
      nonce: "0x6c6e81525343450581a3cf97cf5873ca0000000000000000",
      initCode:
        "0xaee9762ce625e0a8f7b184670fb57c37bfe1d0f1296601cd000000000000000000000000417f5a41305ddc99d18b5e176521b468b2a31b86000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014370ca01d7314e3eea59d57e343323bb7e9de24c6000000000000000000000000",
      callData:
        "0x51945447000000000000000000000000370ca01d7314e3eea59d57e343323bb7e9de24c6000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      callGasLimit: "0x1dd39",
      verificationGasLimit: "0x6e08b",
      preVerificationGas: "0xcdb0",
      maxFeePerGas: "0x7c09102ef",
      maxPriorityFeePerGas: "0xfa123fe0",
      paymasterAndData:
        "0x23b944a93020a9c7c414b1adecdb2fd4cd4e8184000000000000000000000000000000000000000000000000000000006618df020000000000000000000000000000000000000000000000000000000000000000f146170d023ee2a5d1a0e18df6f0e4a7836313917146cdb2267dc3f9944df8af0c12e08230a8e94563b0b5f791058dca3090478c46e7d997ccc96c5e58ab2d901b",
      signature:
        "0x00000000d95457ed7d11e0915ef2928fb631e9f9588420e4b9fe2dd731c34ded4446649706e1b27b665905e7e44f1be8b5fcce60768b104bd68f28c268d173952a7a908f1b",
    };

    const userOperationHash =
      "0xfbd727d3e12550f93bf073d8e0443ee261323398ca3481529d9a0beca5e3de63";

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
      chain: polygonAmoy,
      bundler: cyberBundler,
    });

    expect(cyberAccount.hashUserOperation(userOperation)).toEqual(
      userOperationHash,
    );
  });

  // it("returns the right encoded multi-transaction", () => {
  //   const data = [
  //     {
  //       to: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  //       data: "0xdeadbeef",
  //     },
  //     {
  //       to: "0x8ba1f109551bd432803012645ac136ddd64dba72",
  //       data: "0xcafebabe",
  //     },
  //   ] satisfies UserOperationCallData[];
  //
  //   const encoded =
  //     "0x18dfb3c7000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000deadbeefdeadbeefdeadbeefdeadbeefdeadbeef0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba720000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004deadbeef000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004cafebabe00000000000000000000000000000000000000000000000000000000";
  //
  //   const ownerAddress = "0x370CA01D7314e3EEa59d57E343323bB7e9De24C6";
  //   const cyberBundler = new CyberBundler({
  //     rpcUrl: "https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc",
  //     appId: "ab23459a-32d7-4235-8129-77bd5de27fb1",
  //   });
  //
  //   const cyberAccount = new CyberAccount({
  //     owner: {
  //       address: ownerAddress,
  //       signMessage: async (message) => {
  //         return ("0x" + message) as Hex;
  //       },
  //     },
  //     chain: optimism,
  //     bundler: cyberBundler,
  //   });
  //
  //   expect(cyberAccount.encodeBatchExecuteCallData(data)).toEqual(encoded);
  // });
});
