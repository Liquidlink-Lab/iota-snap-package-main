"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, BookOpenText, Airplay, Plus } from "lucide-react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";

import {
  useCurrentAccount,
  useCurrentWallet,
  useSignPersonalMessage,
} from "@iota/dapp-kit";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app";
import { BASE_TOKEN_TYPE } from "@/lib/config";

export function QuickActions() {
  const { network, setTokenType, open } = useAppStore();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const { currentWallet } = useCurrentWallet();

  const handleSignMessage = async () => {
    if (!currentAccount) return;
    const messageText = `Hello ${currentWallet?.name}`;

    signPersonalMessage(
      {
        message: new TextEncoder().encode(messageText),
        account: currentAccount,
      },
      {
        onSuccess: (result) => {
          console.log(result);
          toast.success(`Message signed successfully`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
      }
    );
  };

  const [txHash, setTxHash] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const currentAccount = useCurrentAccount();
  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-[var(--font-dm-sans)]">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2 bg-transparent"
              onClick={() => {
                setTokenType(BASE_TOKEN_TYPE);
                open();
              }}
            >
              <Send className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Send Iota</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2 bg-transparent"
              onClick={() => {
                window.open(
                  `https://iotascan.com/${network}/account/${currentAccount?.address}`,
                  "mozillaTab"
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
                  disabled={true}
                >
                  <Airplay className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Stake</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stake Iota into Swirl</DialogTitle>
                  <DialogDescription>Stake Iota</DialogDescription>
                  <Input className="my-5" type="number" placeholder="Amount" />

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
                      // onClick={onHandleSignAndExecuteTransaction}
                      disabled={isTransferring}
                    >
                      {isTransferring ? "Staking..." : "Stake"}
                    </Button>
                  </DialogFooter>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col gap-2 bg-transparent"
              onClick={handleSignMessage}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Sign</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
