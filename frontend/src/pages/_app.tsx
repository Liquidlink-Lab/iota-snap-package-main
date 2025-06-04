import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WalletProvider,
  createNetworkConfig,
  IotaClientProvider,
} from "@iota/dapp-kit";
import { registerIotaSnapWallet } from "@/iota-snap-wallet";
import { getFullnodeUrl } from "@iota/iota-sdk/client";
import "@iota/dapp-kit/dist/index.css";
import { Toaster } from "sonner";

// Register the Iota Snap wallet
registerIotaSnapWallet();

// Create a network config for Iota
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
});

// Create a React Query client
const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <IotaClientProvider networks={networkConfig} network="testnet">
        <WalletProvider>
          <Component {...pageProps} />
          <Toaster />
        </WalletProvider>
      </IotaClientProvider>
    </QueryClientProvider>
  );
}
