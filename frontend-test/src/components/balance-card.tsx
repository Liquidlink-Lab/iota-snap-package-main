'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface BalanceCardProps {
  balance: number;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);

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
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold font-[var(--font-dm-sans)] text-foreground">
              {showBalance ? `${balance} IOTA` : '••••••••'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">
                {(balance * 0.2).toFixed(5) +' USD '}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">

            <div>
              <div className="text-sm text-muted-foreground">Staked</div>
              <div className="text-lg font-semibold font-[var(--font-dm-sans)]">
                {showBalance ? '0 IOTA' : '••••••••'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
