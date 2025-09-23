"use client";

import { getFullnodeUrl } from "@iota/iota-sdk/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode } from "react";
import { IotaClientProvider, WalletProvider } from "@iota/dapp-kit";
import { useAppStore } from "@/stores/app";
import { Toaster } from "./ui/sonner";

const queryClient = new QueryClient();

const networks: { [key: string]: { url: string } } = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

const DappProvider = ({ children }: { children: ReactNode }) => {
  const { network } = useAppStore();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <IotaClientProvider
          networks={networks}
          network={network}
          onNetworkChange={(network) => console.log(network)}
        >
          <WalletProvider
            autoConnect={true}
            storageKey="iota-wallet"
            preferredWallets={["IOTA Wallet"]}
          >
            {children}
            <Toaster />
          </WalletProvider>
        </IotaClientProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </>
  );
};
export default DappProvider;
