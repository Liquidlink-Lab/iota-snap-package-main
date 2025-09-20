'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image'


interface Token {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  value: string;
  change24h: number;
  icon: string;
}

const mockTokens: Token[] = [
  {
    id: 'iota',
    name: 'IOTA',
    symbol: 'IOTA',
    balance: '1,234.56',
    value: '$456.78',
    change24h: 5.2,
    icon: '🔷',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    symbol: 'SMR',
    balance: '2,890.12',
    value: '$234.56',
    change24h: -2.1,
    icon: '✨',
  },
  {
    id: 'assembly',
    name: 'Assembly',
    symbol: 'ASMB',
    balance: '5,678.90',
    value: '$123.45',
    change24h: 8.7,
    icon: '🔧',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    balance: '0.5432',
    value: '$1,234.56',
    change24h: 3.4,
    icon: '⟠',
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    balance: '0.0234',
    value: '$987.65',
    change24h: 1.8,
    icon: '₿',
  },
  {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    balance: '1,500.00',
    value: '$345.67',
    change24h: -1.2,
    icon: '🔺',
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    symbol: 'DOT',
    balance: '89.45',
    value: '$456.78',
    change24h: 4.5,
    icon: '⚫',
  },
];
export type CoinItem = { coinType: string; balance: string }

interface CoinListProps {
  items: ReadonlyArray<CoinItem>
  inputCoinType:ReadonlyArray<string>
  coinNameList:ReadonlyArray<string| undefined>
  userCoinValue:ReadonlyArray<string| undefined>
  userCoinIcon:ReadonlyArray<string | null | undefined>
}

export function TokenList({items,inputCoinType,coinNameList,userCoinValue,userCoinIcon}:CoinListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_DISPLAY_COUNT = 4;

  const displayedTokens = isExpanded
    ? mockTokens
    : mockTokens.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreTokens = mockTokens.length > INITIAL_DISPLAY_COUNT;

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

        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
  const coinInputType =
                         inputCoinType[index] !== undefined
                           ? inputCoinType[index]
                         : 'Iota';

                         console.log('coinNameList[index]',coinNameList[index])

            return(
            <div

              className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg">
                   {userCoinIcon[index] &&(
                   <Image
                      src={userCoinIcon[index]}
                      width={500}
                      height={500}
                      alt="Picture of the author"
                    />)
                  }
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {coinNameList[index]}
                  </div>
                  <div className="text-sm text-muted-foreground">
                   BBR
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="font-medium text-foreground">
                   {userCoinValue[index]}
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>

        {hasMoreTokens && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  Show Less
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show More ({mockTokens.length - INITIAL_DISPLAY_COUNT} more)
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
