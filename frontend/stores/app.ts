import { BASE_TOKEN_TYPE } from "@/lib/config";
import { create } from "zustand";

export interface AppState {
  network: string;
  setNetwork: (network: string) => void;
  opened: boolean;
  open: () => void;
  close: () => void;
  tokenType: string;
  setTokenType: (tokenName: string) => void;
  isSendAll: boolean;
  setIsSendAll: (isSendAll: boolean) => void;
  sendAmount: string;
  setSendAmount: (amount: string) => void;
  recipient: string;
  setRecipient: (value: string) => void;
  isTransferring: boolean;
  setIsTransferring: (isTransferring: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  network: "testnet",
  setNetwork: (network) => set({ network }),
  opened: false,
  open: () => set({ opened: true }),
  close: () => set({ opened: false }),
  tokenType: BASE_TOKEN_TYPE,
  setTokenType: (tokenName) => set({ tokenType: tokenName }),
  isSendAll: false,
  setIsSendAll: (isSendAll) => set({ isSendAll }),
  sendAmount: "",
  setSendAmount: (amount) => set({ sendAmount: amount }),
  recipient: "",
  setRecipient: (value) => set({ recipient: value }),
  isTransferring: false,
  setIsTransferring: (isTransferring) => set({ isTransferring }),
}));
