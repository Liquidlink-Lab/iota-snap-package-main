import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  WalletProvider,
  createNetworkConfig,
  IotaClientProvider,
} from '@iota/dapp-kit';
//import { registerIotaSnapWallet } from "iota-snap-for-metamask";
import { registerIotaSnapWallet } from '@/iota-snap-wallet';
import { getFullnodeUrl } from '@iota/iota-sdk/client';
import '@iota/dapp-kit/dist/index.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

// Register the Iota Snap wallet
// console.log(registerIotaSnapWallet());

// Create a network config for Iota
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
});

// Create a React Query client
const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <IotaClientProvider networks={networkConfig} network="testnet">
          <WalletProvider>
            <Component {...pageProps} />
            <Toaster />
          </WalletProvider>
        </IotaClientProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
