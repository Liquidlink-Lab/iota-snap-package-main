import { useState, useEffect, useRef } from 'react';
import { useAction } from '@/contexts/ActionProvider';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, BookOpenText, Airplay, Plus } from 'lucide-react';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DialogContent } from '@/components/ui/dialog';
import { Dialog } from '@/components/ui/dialog';

import { useCurrentAccount } from '@iota/dapp-kit';
import { Input } from '@/components/ui/input';

interface QuickActionsProps {
  onHandleSignMessage: () => void;
  onHandleSignAndExecuteTransaction: () => void;
}

export function QuickActions({
  onHandleSignMessage,
  onHandleSignAndExecuteTransaction,
}: QuickActionsProps) {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const { amount, setSendAmount, receiver, setReceiveUser } = useAction();
  const currentAccount = useCurrentAccount();
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-[var(--font-dm-sans)]">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Dialog
            onOpenChange={(open) => {
              if (!open) {
                setTxHash(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2 bg-transparent"
              >
                <Send className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Send Iota</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer your token</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </DialogDescription>
                <Input
                  className="my-5"
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
                <Input
                  className="my-5"
                  type="text"
                  placeholder="Recipient"
                  value={receiver}
                  onChange={(e) => setReceiveUser(e.target.value)}
                />
                <DialogFooter className="w-full flex justify-between">
                  <div className="flex-3">
                    {txHash && (
                      <a
                        href={`https://explorer.iota.org/txblock/${txHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Tx Result
                      </a>
                    )}
                  </div>
                  <Button
                    className="flex-1"
                    onClick={onHandleSignAndExecuteTransaction}
                    disabled={isTransferring}
                  >
                    {isTransferring ? 'Transferring...' : 'Transfer'}
                  </Button>
                </DialogFooter>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 bg-transparent"
            onClick={() => {
              window.open(
                `https://iotascan.com/testnet/account/${currentAccount?.address}`,
                'mozillaTab',
              );
            }}
          >
            <BookOpenText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">History</span>
          </Button>

          <Dialog
            onOpenChange={(open) => {
              if (!open) {
                setTxHash(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-auto p-4 flex-col w-full gap-2 bg-transparent"
              >
                <Airplay className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Stake</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle> Stake Iota in to Swirl</DialogTitle>
                <DialogDescription>Stake Iota</DialogDescription>
                <Input
                  className="my-5"
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />

                <DialogFooter className="w-full flex justify-between">
                  <div className="flex-3">
                    {txHash && (
                      <a
                        href={`https://explorer.iota.org/txblock/${txHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Tx Result
                      </a>
                    )}
                  </div>
                  <Button
                    className="flex-1"
                    onClick={onHandleSignAndExecuteTransaction}
                    disabled={isTransferring}
                  >
                    {isTransferring ? 'Staking...' : 'Stake'}
                  </Button>
                </DialogFooter>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 bg-transparent"
            onClick={onHandleSignMessage}
          >
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Sign</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
