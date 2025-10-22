import {
  ReadonlyWalletAccount,
  StandardConnectFeature,
  StandardConnectMethod,
  StandardDisconnectFeature,
  StandardDisconnectMethod,
  StandardEventsFeature,
  IotaFeatures,
  IotaSignAndExecuteTransactionMethod,
  IotaSignAndExecuteTransactionOutput,
  IotaSignPersonalMessageInput,
  IotaSignPersonalMessageMethod,
  IotaSignPersonalMessageOutput,
  IotaSignTransactionInput,
  IotaSignTransactionMethod,
  IotaSignTransactionOutput,
  Wallet,
  WalletAccount,
  getWallets,
} from "@iota/wallet-standard";
import { ICON } from "./icon";
import { MetaMaskInpageProvider } from "@metamask/providers";
import {
  SerializedAdminSetFullnodeUrl,
  SerializedWalletAccount,
  StoredState,
  deserializeWalletAccount,
  serializeIotaSignAndExecuteTransactionBlockInput,
  serializeIotaSignMessageInput,
  serializeIotaSignTransactionBlockInput,
} from "./types";
import { convertError } from "./errors";
import { getMetaMaskProvider } from "./metamask";

export * from "./types";
export * from "./errors";
export { getMetaMaskProvider } from "./metamask";
export type { MetaMaskStatus, MetaMaskProviderInfo } from "./metamask";

// export const SNAP_ORIGIN = "local:http://localhost:5050";
export const SNAP_ORIGIN = "npm:@liquidlink-lab/iota-metamask-snap";
export const SNAP_VERSION = "~0.0.14";

type IotaSignMessageFeature = {
  "iota:signMessage": {
    version: "1.0.0";
    signMessage: IotaSignPersonalMessageMethod;
  };
};

export function registerIotaSnapWallet(): IotaSnapWallet {
  const wallets = getWallets();
  for (const wallet of wallets.get()) {
    if (wallet.name === IotaSnapWallet.NAME) {
      console.warn("IotaSnapWallet already registered");
      return wallet as IotaSnapWallet;
    }
  }

  const wallet = new IotaSnapWallet();
  wallets.register(wallet);
  return wallet;
}

export async function getAccounts(
  provider: MetaMaskInpageProvider
): Promise<ReadonlyWalletAccount[]> {
  const res = (await provider.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: SNAP_ORIGIN,
      request: {
        method: "getAccounts",
      },
    },
  })) as [SerializedWalletAccount];

  return res.map(
    (acc) => new ReadonlyWalletAccount(deserializeWalletAccount(acc))
  );
}

export async function admin_getStoredState(provider: MetaMaskInpageProvider) {
  const res = (await provider.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: SNAP_ORIGIN,
      request: {
        method: "admin_getStoredState",
      },
    },
  })) as StoredState;

  return res;
}

export async function admin_setFullnodeUrl(
  provider: MetaMaskInpageProvider,
  network: "mainnet" | "testnet" | "devnet" | "localnet",
  url: string
) {
  const params: SerializedAdminSetFullnodeUrl = {
    network,
    url,
  };
  await provider.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: SNAP_ORIGIN,
      request: {
        method: "admin_setFullnodeUrl",
        params: JSON.parse(JSON.stringify(params)),
      },
    },
  });
}

export async function signPersonalMessage(
  provider: MetaMaskInpageProvider,
  messageInput: IotaSignPersonalMessageInput
): Promise<IotaSignPersonalMessageOutput> {
  const serialized = serializeIotaSignMessageInput(messageInput);

  try {
    return (await provider.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: SNAP_ORIGIN,
        request: {
          method: "signPersonalMessage",
          params: JSON.parse(JSON.stringify(serialized)),
        },
      },
    })) as IotaSignPersonalMessageOutput;
  } catch (e) {
    throw convertError(e);
  }
}

export async function signMessage(
  provider: MetaMaskInpageProvider,
  messageInput: IotaSignPersonalMessageInput
): Promise<IotaSignPersonalMessageOutput> {
  return await signPersonalMessage(provider, messageInput);
}

export async function signTransaction(
  provider: MetaMaskInpageProvider,
  transactionInput: IotaSignTransactionInput
): Promise<IotaSignTransactionOutput> {
  const serialized = await serializeIotaSignTransactionBlockInput(
    transactionInput
  );

  try {
    return (await provider.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: SNAP_ORIGIN,
        request: {
          method: "signTransaction",
          params: JSON.parse(JSON.stringify(serialized)),
        },
      },
    })) as IotaSignTransactionOutput;
  } catch (e) {
    throw convertError(e);
  }
}

export async function signAndExecuteTransaction(
  provider: MetaMaskInpageProvider,
  transactionInput: IotaSignTransactionInput
): Promise<IotaSignAndExecuteTransactionOutput> {
  const serialized = await serializeIotaSignAndExecuteTransactionBlockInput(
    transactionInput
  );

  try {
    return (await provider.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: SNAP_ORIGIN,
        request: {
          method: "signAndExecuteTransaction",
          params: JSON.parse(JSON.stringify(serialized)),
        },
      },
    })) as IotaSignAndExecuteTransactionOutput;
  } catch (e) {
    throw convertError(e);
  }
}

export class IotaSnapWallet implements Wallet {
  static NAME = "IOTA MetaMask Snap";
  #connecting: boolean;
  #connected: boolean;

  #provider: MetaMaskInpageProvider | null = null;
  #accounts: WalletAccount[] | null = null;

  constructor() {
    this.#connecting = false;
    this.#connected = false;
  }

  get version() {
    return "1.0.0" as const;
  }

  get name() {
    return IotaSnapWallet.NAME;
  }

  get icon() {
    return ICON;
  }

  get chains() {
    return [
      "iota:mainnet",
      "iota:testnet",
      "iota:devnet",
      "iota:localnet",
    ] as `${string}:${string}`[];
  }

  get connecting() {
    return this.#connecting;
  }

  get accounts() {
    if (this.#connected && this.#accounts) {
      return this.#accounts;
    } else {
      return [];
    }
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    IotaFeatures &
    StandardEventsFeature &
    IotaSignMessageFeature {
    return {
      "standard:connect": {
        version: "1.0.0",
        connect: this.#connect,
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: this.#disconnect,
      },
      "iota:signPersonalMessage": {
        version: "1.0.0",
        signPersonalMessage: this.#signPersonalMessage,
      },
      "iota:signMessage": {
        version: "1.0.0",
        signMessage: this.#signMessage,
      },
      "iota:signTransaction": {
        version: "2.0.0",
        signTransaction: this.#signTransaction,
      },
      "iota:signAndExecuteTransaction": {
        version: "2.0.0",
        signAndExecuteTransaction: this.#signAndExecuteTransaction,
      },
      "standard:events": {
        version: "1.0.0",
        on: () => {
          return () => {};
        },
      },
    };
  }

  #connect: StandardConnectMethod = async () => {
    if (this.#connecting) {
      throw new Error("Already connecting");
    }

    this.#connecting = true;
    this.#connected = false;

    try {
      const { available, provider } = await getMetaMaskProvider();
      if (!available) {
        throw new Error("MetaMask not detected!");
      }

      await provider.request({
        method: "wallet_requestSnaps",
        params: {
          [SNAP_ORIGIN]: {
            version: SNAP_VERSION,
          },
        },
      });

      this.#provider = provider;
      this.#accounts = await getAccounts(provider);

      this.#connecting = false;
      this.#connected = true;

      return {
        accounts: this.accounts,
      };
    } catch (e) {
      this.#connecting = false;
      this.#connected = false;
      throw e;
    }
  };

  #disconnect: StandardDisconnectMethod = async () => {
    this.#connecting = false;
    this.#connected = false;
    this.#accounts = null;
    this.#provider = null;
  };

  #signPersonalMessage: IotaSignPersonalMessageMethod = async (
    messageInput
  ) => {
    if (!this.#provider) {
      throw new Error(
        "Not connected: Please connect to MetaMask IOTA Snap before signing a personal message."
      );
    }
    return signPersonalMessage(this.#provider, messageInput);
  };

  #signMessage: IotaSignPersonalMessageMethod = async (messageInput) => {
    if (!this.#provider) {
      throw new Error(
        "Not connected: Please connect to MetaMask IOTA Snap before signing a message."
      );
    }
    return signMessage(this.#provider, messageInput);
  };

  #signTransaction: IotaSignTransactionMethod = async (transactionInput) => {
    if (!this.#provider) {
      throw new Error(
        "Not connected: Please connect to MetaMask IOTA Snap before signing a transaction block."
      );
    }
    return signTransaction(this.#provider, transactionInput);
  };

  #signAndExecuteTransaction: IotaSignAndExecuteTransactionMethod = async (
    transactionInput
  ) => {
    if (!this.#provider) {
      throw new Error(
        "Not connected: Please connect to MetaMask IOTA Snap before signing and executing a transaction block."
      );
    }
    return signAndExecuteTransaction(this.#provider, transactionInput);
  };
}
