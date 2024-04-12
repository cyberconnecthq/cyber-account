# CyberAccount SDK

CyberAccount SDK is the official NPM package that implements CyberConnect V3 account abstraction.

## Examples

- [Particle sample](https://github.com/Particle-Network/particle-cyber-sample)

## Supported Chains

- Optimism / Optimism Sepolia
- Polygon / Polygon Amoy
- Base / Base Sepolia
- Linea / Linea Testnet
- Arbitrum / Arbitrum Sepolia
- opBNB / opBNB Testnet

## Installation

```javascript
npm install @cyberlab/cyber-account
```

## Getting Started

```javascript
const cyberBundler = new CyberBundler({
  rpcUrl: "https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc",
  appId: "ab23459a-32d7-4235-8129-77bd5de27fb1",
});

const walletClient = createWalletClient({
  chain: optimismSepolia,
  transport: custom(window.ethereum),
});

const accounts = await walletClient.requestAddresses();
const ownerAddress = accounts[0];

const sign = async (message) => {
  return await walletClient.signMessage({
    account: ownerAddress,
    message: { raw: message },
  });
};

// Optional: Paymaster
const cyberPaymaster = new CyberPaymaster({
  rpcUrl: "<rpcUrl>",
  appId: "<appId>",
  generateJwt: (cyberAccountAddress) => jwt,
});

const cyberAccount = new CyberAccount({
  chain: {
    id: 420,
    testnet: true,
  },
  owner: {
    address: ownerAddress,
    signMessage: sign,
  },
  bundler: cyberBundler,
  paymaster: cyberPaymaster,
});
```

### Sending Native Token

```javascript
cyberAccount.sendTransaction({
  to: "0x1e6754b227c6ae4b0ca61d82f79d60660737554a",
  value: parseUnits("0.0001", 18),
  data: "0x",
});
```

- `to` - Address of the token receiver
- `value` - The amount of the native token to send
- `data` - The encoded data of the transaction

### Sending ERC20 Tokens

Sending ERC20 tokens is different from sending the native token, it requires two steps:

1. Encode the transaction data with the ERC20 contract ABI

   ```javascript
   const encoded = encodeFunctionData({
     abi: erc20ABI,
     functionName: "transfer",
     args: [
       "0x85AAc6211aC91E92594C01F8c9557026797493AE",
       parseUnits("0.5", 18),
     ],
   });
   ```

   Argument list:

   - Address - The address of the token receiver
   - Amount - The amount of the token to send

2. Send the transaction with the encoded data

   ```javascript
   cyberAccount.sendTransaction({
     to: "0x32307adfFE088e383AFAa721b06436aDaBA47DBE",
     value: BigInt(0),
     data: encoded,
   });
   ```

- `to` - Address of the ERC20 token contract
- `value` - The amount of native token to send, it should be 0
- `data` - The encoded ERC20 token transaction detail

---

## CyberAccount

`class CyberAccount({chain, owner, bundler, paymaster})`

### Parameters

- chain: The target chain of the CyberAccount is deployed on.
  ```typescript
  type Chain = {
    id: number;
    testnet?: boolean;
    rpcUrl?: string;
  };
  ```
- owner: The owner of a CyberAccount (Check [Signing the user operation hash section](#signing-the-user-operation-hash) for the details).

  ```typescript
  type Owner = {
    address: Address;
    signMessage: async (message: string) => Promise<Hash>;
  }
  ```

- bundler (CyberBundler): An instance of [`CyberBundler`](#cyberbundler) for handling the CyberAccount user operations.

- paymaster (CyberPaymaster - Optional): An instance of [`CyberPaymaster`](#cyberpaymaster) for sponsoring the CyberAccount transactions.

### Signing the user operation hash

By default, both Ethers and Viem will convert a message string to UTF-8 bytes when signing a message, for siging `userOperationHash` we need to avoid this conversion.

- Signing `userOperationHash` using Viem

```typescript
const walletClient = createWalletClient({
  chain: optimismSepolia,
  transport: custom(window.ethereum),
});

const accounts = await walletClient.requestAddresses();
const ownerAddress = accounts[0];

const sign = async (userOperationHash) => {
  return await walletClient.signMessage({
    account: ownerAddress,
    message: { raw: userOperationHash }, // pass the UO hash as a raw message
  });
};
```

- Signing `userOperationHash` using Ethers

```typescript
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const sign = async (userOperationHash) => {
  return await signer.signMessage(hexToBytes(userOperationHash)); // convert the UO hash into bytes before passing into the signer
};
```

### Properties

- `chain` Chain - The target chain that the CyberAccount is deployed on.
- `owner` Owner - The owner of the CyberAccount
- `address` Address - The contract address of the CyberAccount
- `bundler` CyberBundler - The Bundler for handling the CyberAccount user operations.
- `paymaster` CyberPaymaster - The Paymaster for sponsoring the CyberAccount transactions.

### Methods

- `isAccountDeployed: async () => boolean;` - Checks if the CyberAccount is deployed.
- `getAccountInitCode: async () => Hex;` - Returns the init code of the CyberAccount.
- `getCallData: (userOperationCallData: UserOperationCallData);` - Get the encoded executable call data.
- `getSignature: (rawSig: Hash) => Hash;` - Get the wrapped signature for validation.
- `sendTransaction: async (transcationData: TransactionData, {disablePaymaster?: boolean}) => Promise<Hash | null>` - Send a transaction using the CyberAccount.
- `estimateTransaction: async (transcationData: TransactionData, {disablePaymaster?: boolean}) => Promise<EstimateUserOperationReturn>` - Estimate the credit cost of a transaction using the CyberAccount if the CyberPaymaster is provided, otherwise return the estimated gas from the bundler.

## CyberBundler

CyberBundler is a standard ERC-4337 bundler class.

```typescript
const cyberBundler = new CyberBundler({
  rpcUrl: "https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc",
  appId: "ab23459a-32d7-4235-8129-77bd5de27fb1",
});
```

### RPC Urls

- **For development**

  ```
  https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc
  ```

- **For production**

  ```
  https://api.cyberconnect.dev/cyberaccount/bundler/v1/rpc
  ```

### Methods

- `sendUserOperation` - Sends a user operation transaction to a bundler.
- `getUserOperationReceipt` - Gets a user operation receipt based on the `userOperationHash`.
- `getUserOperationByHash` - Returns a user operation based on the `userOperationHash`.
- `estimateUserOperationGas` - Estimate the gas cost of a user operation.
- `supportedEntryPoints` - Returns an array of the entryPoint addresses supported by the client.

## CyberPaymaster

CyberPaymaster is a Paymaster class for sponsoring CyberAccount transactions.

```typescript
const cyberPaymaster = new CyberPaymaster({
  rpcUrl: "<rpcUrl>",
  appId: "<appId>",
  generateJwt: (cyberAccountAddress) => jwt,
});
```

### RPC Urls

- **For development**

  ```
  https://api.stg.cyberconnect.dev/cyberaccount/paymaster/v1/rpc
  ```

- **For production**

  ```
  https://api.cyberconnect.dev/cyberaccount/paymaster/v1/rpc
  ```

### Methods

- `getUserCredit` - Returns the user credit.
- `estimateUserOperation` - Estimate the credit cost of a user operation.
- `sponsorUserOperation` - Returns the complete ready-for-sign user operation with `paymasterAndData`.
- `rejectUserOperation` - Rejects a user operation.
- `listPendingUserOperations` - Returns a list of pending user operations.
- `topUp: ({amount, chainId, sender, to, writeContract}) => Promise<Hash>` - Tops up the user credit, it returns the top up transaction hash.
  - `amount` - The amount of credit to top up.
  - `chainId` - The target chain id.
  - `sender` - (Optional) The address of the top up payer, it's CyberAccount owner address by default.,
  - `to` - (Optional) The address of the gas credit consumer, it's CyberAccount address by default.
  - `writeContract: (request: TopUpContractRequest) => Promise<Hash>` - (Optional) Overrides the default contract writing function.

## RPC Errors

The RPC errors from the SDK are error instances from [Viem](https://viem.sh/docs/glossary/errors.html#errors). Two types of RPC errors can be thrown from the SDK:

1. Provider RPC errors
2. RPC Request errors

**Properties**

- `name` - The RPC error name
- `code` - The RPC error code
- `details` - The RPC error details
- `shortMessage` - The RPC error short message

_We recommend using the `code` property to create a custom error handler._

### Provider RPC Errors

| code | description                   |
| ---- | ----------------------------- |
| 4001 | User denied message signature |

_Check all possible provider RPC errors [here](https://eips.ethereum.org/EIPS/eip-1193#provider-errors)._

### RPC Request Errors

#### Bundler RPC errors

For the bundler RPC errors, you can find the details in [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337#rpc-methods-eth-namespace).

#### Paymaster RPC errors (CyberPaymaster)

| Code   | Description                   |
| ------ | ----------------------------- |
| -32500 | Rejected by EP or Account     |
| -32501 | Rejected by Paymaster         |
| -32502 | Banned Opcode                 |
| -32503 | Short Deadline                |
| -32504 | Banned or Throttled Paymaster |
| -32505 | Invalid Paymaster Stake       |
| -32506 | Invalid Aggregator            |
| -32507 | Invalid Signature             |
| -32601 | Method Not Found              |
| -32602 | Invalid Params                |
| -32603 | Internal Error                |
| -42000 | Invalid Chain ID              |
| -42001 | Gas Price Beyond Limit        |
| -42002 | Invalid Sponsor Sig Type      |
| -42003 | Invalid Sponsor Sig           |
| -42004 | Insufficient Credits          |
| -42005 | Failed Get Price              |
| -42006 | Account Balance Locked        |
| -42007 | Pimlico Call Failed           |
| -42008 | Stackup Call Failed           |
| -42009 | Invalid Owner                 |
| -42010 | Invalid Calldata              |
| -42012 | User Op Not Found             |
| -42014 | Biconomy Call Failed          |
| -42015 | Invalid Value                 |
| -42016 | User Op Not Estimated         |
| -42017 | Alchemy Call Failed           |
| -42018 | Exist Pending User Op         |
| -42019 | Send User Op Wrong State      |
| -42020 | PM and Data Timeout           |
| -42021 | Invalid Sender                |
| -42022 | Rate Limit                    |
| -42024 | Invalid App ID                |
| -42025 | User Op Already Sent          |
| -42026 | Invalid Auth Token            |
| -42027 | Auth Not Allowed              |
| -32521 | Execution Reverted            |
