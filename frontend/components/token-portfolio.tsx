"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader, RefreshCcw, Send } from "lucide-react";
import { useCurrentAccount } from "@iota/dapp-kit";
import useTokens from "@/hooks/useTokens";
import { useAppStore } from "@/stores/app";

export type CoinDetail = {
  coinType: string;
  name?: string;
  symbol?: string;
  iconUrl?: string | null;
  balance: string;
};

export function TokenPortfolio() {
  const currentAccount = useCurrentAccount();
  const { open, setTokenType } = useAppStore();
  const { tokens, isFetching, refetch } = useTokens({
    address: currentAccount?.address ?? "",
  });

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-[var(--font-dm-sans)]">
              Token Portfolio
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your cryptocurrency holdings
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {isFetching ? (
              <Loader className="animate-spin text-muted-foreground" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tokens.length > 0 ? (
            tokens.map((token) => (
              <div
                key={token.coinType}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg">
                    {token.iconUrl && (
                      <Image
                        src={token.iconUrl}
                        width={40}
                        height={40}
                        alt={`${token.name} logo`}
                        className="rounded-full"
                        unoptimized
                      />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {token.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {token.symbol}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="font-medium text-foreground">
                      {token.balance}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent hover:bg-primary/10 border-primary/20"
                      onClick={() => {
                        setTokenType(token.coinType);
                        open();
                      }}
                    >
                      <Send className="h-3 w-3" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {isFetching ? "Loading tokens..." : "No tokens found."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
