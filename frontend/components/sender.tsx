"use client";

import { useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAppStore } from "@/stores/app";
import useTokens from "@/hooks/useTokens";
import { useCurrentAccount } from "@iota/dapp-kit";
import { toast } from "sonner";
import { BASE_TOKEN_TYPE } from "@/lib/config";
import { useSend } from "@/hooks/useSend";

export const Sender = () => {
  const {
    opened,
    close,
    tokenType,
    sendAmount,
    setSendAmount,
    setIsSendAll,
    recipient,
    setRecipient,
    isTransferring,
    isSendAll,
  } = useAppStore();
  const currentAccount = useCurrentAccount();
  const { tokens, refetch } = useTokens({ address: currentAccount?.address as string });
  const token = tokens.find((t) => t.coinType === tokenType);
  const isGasLike = token?.coinType === BASE_TOKEN_TYPE;
  const send = useSend();

  const amountInSmallestUnit = useMemo(() => {
    if (!sendAmount || !token) return 0n;
    const decimals = token.decimals || 0;
    try {
      const amount = Number(sendAmount);
      if (isNaN(amount) || amount < 0) return 0n;
      return BigInt(Math.round(amount * 10 ** decimals));
    } catch (error) {
      console.error("Error converting amount to smallest unit:", error);
      return 0n;
    }
  }, [sendAmount, token]);

  async function handleSend() {
    try {
      if (!recipient) throw new Error("Please fill in the recipient address");

      if (isGasLike && isSendAll) {
        return await send.payAllIota({ recipient });
      }

      if (!isGasLike && isSendAll) {
        return await send.sendAllNonIota({ coinType: tokenType, recipient });
      }

      if (isGasLike && !isSendAll) {
        return await send.sendIota({
          recipient,
          amount: amountInSmallestUnit,
        });
      }

      if (!isGasLike && !isSendAll) {
        return await send.sendNonIota({
          coinType: tokenType,
          recipient,
          amount: amountInSmallestUnit,
        });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      refetch();
      close();
    }
  }

  return (
    <Dialog open={opened} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Your {token?.name}</DialogTitle>
          <DialogDescription>
            Enter the amount and recipient address to send your tokens.
          </DialogDescription>
          <div className="relative my-5">
            <Input
              type="number"
              placeholder="Amount"
              value={sendAmount}
              onChange={(e) => {
                setSendAmount(e.target.value);
                setIsSendAll(false);
              }}
              className="pr-12"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
              onClick={() => {
                setSendAmount(token?.balance || "0");
                setIsSendAll(true);
              }}
            >
              Max
            </Button>
          </div>
          <div className="text-sm text-muted-foreground -mt-4 px-1">
            In smallest unit:{" "}
            {new Intl.NumberFormat("en-US").format(amountInSmallestUnit)}
          </div>
          <Input
            className="my-5"
            type="text"
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <DialogFooter className="w-full flex justify-between gap-2">
            <Button onClick={() => handleSend()} disabled={isTransferring}>
              {isTransferring ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
