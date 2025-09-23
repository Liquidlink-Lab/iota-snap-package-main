"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader, RefreshCcw } from "lucide-react";
import useBalance from "@/hooks/useBalance";
import { useCurrentAccount } from "@iota/dapp-kit";
import { useAppStore } from "@/stores/app";
import { Group } from "@mantine/core";
import useTokens from "@/hooks/useTokens";

export function BalanceCard() {
  const currentAccount = useCurrentAccount();
  const {
    amount: balance,
    usdValue,
    isLoading,
    refetch,
  } = useBalance({
    address: currentAccount?.address,
  });
  const { tokens } = useTokens({
    address: currentAccount?.address as string,
  });
  const [showBalance, setShowBalance] = useState(true);
  const { network } = useAppStore();

  return (
    <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-[var(--font-dm-sans)]">
              Total Balance
            </CardTitle>
            <CardDescription>Your IOTA wallet balance</CardDescription>
          </div>
          <Group gap={4}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isLoading ? (
                <Loader className="animate-spin text-muted-foreground" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </Group>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold text-foreground">
              {showBalance ? `${balance} IOTA` : "••••••••"}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">
                {showBalance ? `${usdValue} USD` : "••••••••"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div>
              <div className="text-sm text-muted-foreground">Network</div>
              <div className="text-lg font-semibold font-[var(--font-dm-sans)]">
                {network}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Staked</div>
              <div className="text-lg font-semibold font-[var(--font-dm-sans)]">
                {showBalance
                  ? `${
                      tokens.find((t) => t.symbol === "stIOTA")?.balance || 0
                    } stIOTA`
                  : "••••••••"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
