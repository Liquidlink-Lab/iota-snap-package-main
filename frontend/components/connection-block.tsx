"use client";

import { Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ConnectModal, useCurrentWallet } from "@iota/dapp-kit";
import { Button } from "./ui/button";
import { useEffect, useMemo } from "react";
import {
  metaMaskAvailable,
  registerIotaSnapWallet,
} from "@liquidlink-lab/iota-snap-for-metamask";
import { getWallets } from "@iota/wallet-standard";

export const ConnectionBlock = () => {
  const { isConnected } = useCurrentWallet();
  const wallets = useMemo(() => getWallets(), []);

  useEffect(() => {
    const checkMetaMask = async () => {
      try {
        await metaMaskAvailable();
      } catch (e) {
        console.error(e);
      }
    };
    checkMetaMask();
    registerIotaSnapWallet(wallets);
  }, [wallets]);

  if (isConnected) {
    return null;
  }

  return (
    <Card className="text-center border-border/50">
      <CardHeader className="pb-4">
        <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold font-[var(--font-dm-sans)]">
          Connect Your Wallet
        </CardTitle>
        <CardDescription className="text-base">
          Connect to IOTA Snap using MetaMask Wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConnectModal
          trigger={
            <Button className="w-full max-w-sm mx-auto bg-primary hover:bg-primary/90 text-primary-foreground font-[var(--font-dm-sans)] font-medium">
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
};
