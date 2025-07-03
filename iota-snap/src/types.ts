import {
  ExecuteTransactionRequestType,
  IotaTransactionBlockResponseOptions,
} from "@iota/iota-sdk/client";
import { Transaction } from "@iota/iota-sdk/transactions";
import { fromB64, toB64 } from "@iota/iota-sdk/utils";
import {
  IotaSignAndExecuteTransactionInput,
  IotaSignPersonalMessageInput,
  IotaSignTransactionInput,
  WalletAccount,
  WalletIcon,
} from "@iota/wallet-standard";

/**
 * Passing in objects directly to the Snap sometimes doesn't work correctly so we need to serialize to primitive values
 * and then deserialize on the other side.
 */

/* ======== SerializedWalletAccount ======== */

export interface SerializedWalletAccount {
  address: string;
  publicKey: string;
  chains: string[];
  features: string[];
  label?: string;
  icon?: string;
}

export function serializeWalletAccount(
  account: WalletAccount
): SerializedWalletAccount {
  return {
    address: account.address,
    publicKey: toB64(account.publicKey as Uint8Array),
    features: [...account.features],
    chains: [...account.chains],
    label: account.label,
    icon: account.icon,
  };
}

export function deserializeWalletAccount(
  account: SerializedWalletAccount
): WalletAccount {
  return {
    address: account.address,
    publicKey: fromB64(account.publicKey),
    chains: account.chains.map((chain) => chain as `${string}:${string}`),
    features: account.features.map(
      (feature) => feature as `${string}:${string}`
    ),
    label: account.label,
    icon: account.icon as WalletIcon,
  };
}

/* ======== SerializedIotaSignMessageInput ======== */

export interface SerializedIotaSignMessageInput {
  message: string;
  account: SerializedWalletAccount;
}

export function serializeIotaSignMessageInput(
  input: IotaSignPersonalMessageInput
): SerializedIotaSignMessageInput {
  return {
    message: toB64(input.message),
    account: serializeWalletAccount(input.account),
  };
}

export function deserializeIotaSignMessageInput(
  input: SerializedIotaSignMessageInput
): IotaSignPersonalMessageInput {
  return {
    message: fromB64(input.message),
    account: deserializeWalletAccount(input.account),
  };
}

/* ======== SerializedIotaSignTransactionBlockInput ======== */

export interface SerializedIotaSignTransactionBlockInput {
  transaction: string;
  account: SerializedWalletAccount;
  chain: string;
}

export async function serializeIotaSignTransactionBlockInput(
  input: IotaSignTransactionInput
): Promise<SerializedIotaSignTransactionBlockInput> {
  return {
    transaction: await input.transaction.toJSON(),
    account: serializeWalletAccount(input.account),
    chain: input.chain,
  };
}

export function deserializeIotaSignTransactionBlockInput(
  input: SerializedIotaSignTransactionBlockInput
): IotaSignTransactionInput {
  return {
    transaction: Transaction.from(input.transaction) as any,
    account: deserializeWalletAccount(input.account),
    chain: input.chain as `${string}:${string}`,
  };
}

/* ======== SerializedIotaSignAndExecuteTransactionBlockInput ======== */

export interface SerializedIotaSignAndExecuteTransactionBlockInput {
  transaction: string;
  account: SerializedWalletAccount;
  chain: string;
  options?: IotaTransactionBlockResponseOptions;
}

export async function serializeIotaSignAndExecuteTransactionBlockInput(
  input: IotaSignAndExecuteTransactionInput
): Promise<SerializedIotaSignAndExecuteTransactionBlockInput> {
  return {
    transaction: await input.transaction.toJSON(),
    account: serializeWalletAccount(input.account),
    chain: input.chain,
    options: input.options,
  };
}

export function deserializeIotaSignAndExecuteTransactionBlockInput(
  input: SerializedIotaSignAndExecuteTransactionBlockInput
): IotaSignAndExecuteTransactionInput {
  return {
    ...input,
    transaction: Transaction.from(input.transaction) as any,
    account: deserializeWalletAccount(input.account),
    chain: input.chain as `${string}:${string}`,
  };
}

/* ======== StoredState ======== */

export interface StoredState {
  mainnetUrl: string;
  testnetUrl: string;
  devnetUrl: string;
  localnetUrl: string;
}

/* ======== SerializedAdminSetFullnodeUrl ======== */

export interface SerializedAdminSetFullnodeUrl {
  network: "mainnet" | "testnet" | "devnet" | "localnet";
  url: string;
}
