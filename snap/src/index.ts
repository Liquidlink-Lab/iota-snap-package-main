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
import { MetaMaskInpageProvider } from "@metamask/providers";
import detectEthereumProvider from "@metamask/detect-provider";

import { ICON } from "./icon";
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

export * from "./types";
export * from "./errors";

type BaseProvider = MetaMaskInpageProvider;

// export const IOTA_SNAP_ORIGIN = "npm:@3mate/iota-metamask-snap";
export const IOTA_SNAP_ORIGIN =
  process.env.NEXT_PUBLIC_SNAP_ID || "local:http://localhost:5050";
export const SNAP_VERSION = "^0.0.1";

export function registerIotaSnapWallet(): Wallet {
  const wallets = getWallets();
  for (const wallet of wallets.get()) {
    if (wallet.name === IotaSnapWallet.NAME) {
      console.warn("IotaSnapWallet already registered");
      return wallet;
    }
  }

  const wallet = new IotaSnapWallet();
  wallets.register(wallet as unknown as Wallet);
  return wallet;
}

export async function getAccounts(
  provider: BaseProvider
): Promise<ReadonlyWalletAccount[]> {
  const res = (await provider.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: IOTA_SNAP_ORIGIN,
      request: {
        method: "getAccounts",
      },
    },
  })) as [SerializedWalletAccount];

  return res.map(
    (acc) => new ReadonlyWalletAccount(deserializeWalletAccount(acc))
  );
}

export async function admin_getStoredState(provider: BaseProvider) {
  const res = (await provider.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: IOTA_SNAP_ORIGIN,
      request: {
        method: "admin_getStoredState",
      },
    },
  })) as StoredState;

  return res;
}

export async function admin_setFullnodeUrl(
  provider: BaseProvider,
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
      snapId: IOTA_SNAP_ORIGIN,
      request: {
        method: "admin_setFullnodeUrl",
        params: JSON.parse(JSON.stringify(params)),
      },
    },
  });
}

export async function signPersonalMessage(
  provider: BaseProvider,
  messageInput: IotaSignPersonalMessageInput
): Promise<IotaSignPersonalMessageOutput> {
  const serialized = serializeIotaSignMessageInput(messageInput);

  try {
    return (await provider.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: IOTA_SNAP_ORIGIN,
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
  provider: BaseProvider,
  messageInput: IotaSignPersonalMessageInput
): Promise<IotaSignPersonalMessageOutput> {
  return await signPersonalMessage(provider, messageInput);
}

export async function signTransaction(
  provider: BaseProvider,
  transactionInput: IotaSignTransactionInput
): Promise<IotaSignTransactionOutput> {
  const serialized = await serializeIotaSignTransactionBlockInput(
    transactionInput
  );

  try {
    return (await provider.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: IOTA_SNAP_ORIGIN,
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
  provider: BaseProvider,
  transactionInput: IotaSignTransactionInput
): Promise<IotaSignAndExecuteTransactionOutput> {
  const serialized = await serializeIotaSignAndExecuteTransactionBlockInput(
    transactionInput
  );

  try {
    return (await provider.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: IOTA_SNAP_ORIGIN,
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

export interface MetaMaskStatus {
  available: boolean;
  version?: string;
  supportsSnaps: boolean;
  iotaSnapInstalled: boolean;
}

export async function metaMaskAvailable(): Promise<MetaMaskStatus> {
  const provider = (await detectEthereumProvider({
    silent: true,
  })) as BaseProvider | null;
  if (!provider) {
    return {
      available: false,
      supportsSnaps: false,
      iotaSnapInstalled: false,
    };
  }
  if (!provider.isMetaMask) {
    return {
      available: false,
      iotaSnapInstalled: false,
      supportsSnaps: false,
    };
  }
  try {
    const version = await provider.request<string>({
      method: "web3_clientVersion",
    });
    const snaps = await provider.request<Record<string, unknown>>({
      method: "wallet_getSnaps",
    });
    const iotaSnapInstalled =
      !!snaps && "npm:@3mate/iota-metamask-snap" in snaps;

    return {
      available: true,
      version: version!,
      supportsSnaps: true,
      iotaSnapInstalled,
    };
  } catch (e) {
    console.warn(e);
    return {
      available: true,
      supportsSnaps: false,
      iotaSnapInstalled: false,
    };
  }
}

export class IotaSnapWallet implements Wallet {
  static NAME = "Iota MetaMask Snap";
  #connecting: boolean;
  #connected: boolean;

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
    return ICON as `data:image/svg+xml;base64,${string}`;
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
    StandardEventsFeature {
    return {
      "standard:connect": {
        version: "1.0.0" as any,
        connect: this.#connect,
      },
      "standard:disconnect": {
        version: "1.0.0" as any,
        disconnect: this.#disconnect,
      },
      "iota:signPersonalMessage": {
        version: "1.0.0" as any,
        signPersonalMessage: this.#signPersonalMessage,
      },
      "iota:signMessage": {
        version: "1.0.0" as any,
        signMessage: this.#signMessage,
      },
      "iota:signTransaction": {
        version: "1.0.0" as any,
        signTransaction: this.#signTransaction,
      },
      "iota:signAndExecuteTransaction": {
        version: "1.0.0" as any,
        signAndExecuteTransaction: this.#signAndExecuteTransaction,
      },
      "standard:events": {
        version: "1.0.0" as any,
        on: () => {
          return () => {};
        },
      },
    } as any;
  }

  #connect: StandardConnectMethod = async () => {
    if (this.#connecting) {
      throw new Error("Already connecting");
    }

    this.#connecting = true;
    this.#connected = false;

    try {
      const provider = (await detectEthereumProvider({
        silent: true,
      })) as BaseProvider | null;
      if (!provider) {
        throw new Error("MetaMask not detected!");
      }

      const mmStatus = await metaMaskAvailable();
      if (!mmStatus.available) {
        throw new Error("MetaMask not detected!");
      }

      await provider.request({
        method: "wallet_requestSnaps",
        params: {
          [IOTA_SNAP_ORIGIN]: {
            version: SNAP_VERSION,
          },
        },
      });

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
  };

  #signPersonalMessage: IotaSignPersonalMessageMethod = async (
    messageInput
  ) => {
    const provider = (await detectEthereumProvider({
      silent: true,
    })) as BaseProvider | null;
    if (!provider) {
      throw new Error("MetaMask not detected!");
    }
    return signPersonalMessage(provider, messageInput);
  };

  #signMessage: IotaSignPersonalMessageMethod = async (messageInput) => {
    const provider = (await detectEthereumProvider({
      silent: true,
    })) as BaseProvider | null;
    if (!provider) {
      throw new Error("MetaMask not detected!");
    }
    return signMessage(provider, messageInput);
  };

  #signTransaction: IotaSignTransactionMethod = async (transactionInput) => {
    const provider = (await detectEthereumProvider({
      silent: true,
    })) as BaseProvider | null;
    if (!provider) {
      throw new Error("MetaMask not detected!");
    }
    return signTransaction(provider, transactionInput);
  };

  #signAndExecuteTransaction: IotaSignAndExecuteTransactionMethod = async (
    transactionInput
  ) => {
    const provider = (await detectEthereumProvider({
      silent: true,
    })) as BaseProvider | null;
    if (!provider) {
      throw new Error("MetaMask not detected!");
    }
    return signAndExecuteTransaction(provider, transactionInput);
  };
}
