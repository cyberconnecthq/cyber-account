# CyberAccount SDK

CyberAccount SDK is the official NPM package that implements CyberConnect V3 account abstraction.

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
  chain: optimismGoerli,
  transport: custom(window.ethereum),
});

const ownerAddress = "0x370CA01D7314e3EEa59d57E343323bB7e9De24C6";
const sign = async (message) => {
  return await walletClient.signMessage({
    account: ownerAddress,
    message: { raw: message },
  });
};

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
});

cyberAccount.sendTransaction({
  to: "0x1e6754b227c6ae4b0ca61d82f79d60660737554a",
  value: parseUnits("0.0001", 18),
  data: "0x",
});
```

---

## CyberAccount

`class CyberAccount({chain, owner, bundler})`

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

### Signing the user operation hash

By default, both Ethers and Viem will convert a message string to UTF-8 bytes when signing a message, for siging `userOperationHash` we need to avoid this conversion.

- Signing `userOperationHash` using Viem

```typescript
const walletClient = createWalletClient({
  chain: optimismGoerli,
  transport: custom(window.ethereum),
});

const ownerAddress = "0x370CA01D7314e3EEa59d57E343323bB7e9De24C6";
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

### Methods

- `isAccountDeployed: async () => boolean;` - Checks if the CyberAccount is deployed.
- `getAccountInitCode: async () => Hex;` - Returns the init code of the CyberAccount.
- `getCallData: (userOperationCallData: UserOperationCallData);` - Get the encoded executable call data.
- `getSignature: (rawSig: Hash) => Hash;` - Get the wrapped signature for validation.
- `sendTransaction: async (transcationData: TransactionData) => Promise<Hash | null>` - Send a transaction using the CyberAccount.

## CyberBundler

CyberBundler is a standard ERC-4337 bundler class.

```typescript
const cyberBundler = new CyberBundler({
  rpcUrl: "https://api.stg.cyberconnect.dev/cyberaccount/bundler/v1/rpc",
  appId: "ab23459a-32d7-4235-8129-77bd5de27fb1",
});
```

### Methods

- `sendUserOperation` - Sends a user operation transaction to a bundler.
- `getUserOperationReceipt` - Gets a user operation receipt based on the `userOperationHash`.
- `getUserOperationByHash` - Returns a user operation based on the `userOperationHash`.
- `estimateUserOperationGas` - Estimate the gas cost of a user operation.
- `supportedEntryPoints` - Returns an array of the entryPoint addresses supported by the client.
