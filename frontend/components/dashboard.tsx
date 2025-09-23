"use client";

import { useCurrentAccount, useDisconnectWallet } from "@iota/dapp-kit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Wallet, Copy } from "lucide-react";
import { BalanceCard } from "./balance-card";
import { QuickActions } from "./quick-actions";
import { TokenPortfolio } from "./token-portfolio";
import { Button } from "./ui/button";
import { Sender } from "./sender";

export const Dashboard = () => {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: disconnectAsync } = useDisconnectWallet();

  if (!currentAccount) {
    return null;
  }

  return (
    <>
      <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-800">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-[var(--font-dm-sans)]">
                  Wallet Connected
                </CardTitle>
                <CardDescription>
                  Successfully connected to IOTA network
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-card border-border/50">
            <div className="flex items-center gap-2">
              <span className="hidden md:block text-sm font-mono text-muted-foreground">
                Address: {currentAccount.address}
              </span>
              <span className="block md:hidden text-sm font-mono text-muted-foreground">
                {shortAddress(currentAccount.address)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(currentAccount.address ?? "")
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectAsync()}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BalanceCard />
        </div>
        <QuickActions />
        <div className="lg:col-span-3">
          <TokenPortfolio />
        </div>
      </div>
      <Sender />
    </>
  );
};

function shortAddress(
  addr?: string,
  opts?: {
    start?: number; // 前段保留長度（hex 地址）
    end?: number; // 後段保留長度
    delimiter?: string; // 中間替代字串
  }
): string {
  if (!addr) return "";
  const a = addr.trim();
  const start = opts?.start ?? 8;
  const end = opts?.end ?? 8;
  const delimiter = opts?.delimiter ?? "…";
  const body = a.slice(2);

  if (body.length <= start + end + 1) return a;

  return `0x${body.slice(0, start)}${delimiter}${body.slice(-end)}`;
}
