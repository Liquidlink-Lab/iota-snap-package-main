"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Avatar, Center, Tabs } from "@mantine/core";
import useBalance from "@/hooks/useBalance";
import useTokens from "@/hooks/useTokens";
import useSwirlStat from "@/hooks/useSwirlStat";
import Image from "next/image";

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
import { useSend } from "@/hooks/useSend";
import Link from "next/link";

export function QuickActions() {
  const {
    network,
    setTokenType,
    open,
    isTransferring,
    setSendAmount,
    sendAmount,
  } = useAppStore();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const { currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();

  const { stakeWithSplit, unstakeWithSplit } = useSend();
  const { swirlStat } = useSwirlStat();

  const { amount: iotaBalance } = useBalance({
    address: currentAccount?.address,
  });
  const { tokens } = useTokens({ address: currentAccount?.address as string });
  const stakedBalance =
    tokens.find((t) => t.symbol === "stIOTA")?.balance || "0";

  const amountInSmallestUnit = useMemo(() => {
    const decimals = 9; // IOTA/stIOTA decimals
    try {
      const amount = Number(sendAmount);
      if (isNaN(amount) || amount < 0) return 0n;
      return BigInt(Math.round(amount * 10 ** decimals));
    } catch (error) {
      console.error("Error converting amount to smallest unit:", error);
      return 0n;
    }
  }, [sendAmount]);

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

  async function handleStake() {
    try {
      const result = await stakeWithSplit({
        amount: amountInSmallestUnit,
      });
      console.log("🚀 ~ handleStake ~ result:", result);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleUnstake() {
    try {
      const result = await unstakeWithSplit({
        amount: amountInSmallestUnit,
      });
      console.log("🚀 ~ handleUnstake ~ result:", result);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

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
            <Dialog onOpenChange={(isOpen) => !isOpen && setSendAmount("")}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col w-full gap-2 bg-transparent"
                  disabled={network !== "mainnet"}
                >
                  <Avatar
                    size="xs"
                    src="https://strapi-dev.scand.app/uploads/Swirl_logo_921e0c56bc.jpg"
                  />
                  <span className="text-sm font-medium">Stake</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stake / Unstake IOTA</DialogTitle>
                  <DialogDescription>
                    Stake IOTA to get stIOTA, or unstake stIOTA to get back
                    IOTA.
                    <Link href="https://swirlstake.com/" target="_blank">
                      <Image
                        className="invert dark:invert-0 mx-auto mt-8"
                        src="https://swirlstake.com/assets/logo-with-name.svg"
                        width={150}
                        height={50}
                        alt="SwirlStake Logo"
                        priority
                      />
                    </Link>
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="stake" className="mt-2" color="gray">
                  <Tabs.List grow>
                    <Tabs.Tab value="stake">Stake</Tabs.Tab>
                    <Tabs.Tab value="unstake">Unstake</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="stake" pt="md">
                    <div className="flex justify-end text-sm text-muted-foreground pr-1">
                      Balance: {iotaBalance ? Number(iotaBalance) : "0"}
                    </div>
                    <div className="relative mb-5">
                      <Input
                        type="number"
                        placeholder="Amount to Stake"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="pr-12"
                        min={1}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                        onClick={() => setSendAmount(iotaBalance || "0")}
                      >
                        Max
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground -mt-4 mb-5 px-1">
                      In smallest unit:{" "}
                      {new Intl.NumberFormat("en-US").format(
                        amountInSmallestUnit
                      )}
                      <p>
                        You will get: ~=
                        {swirlStat && swirlStat.ratio
                          ? (Number(sendAmount) * swirlStat.ratio).toFixed(4)
                          : "..."}{" "}
                        stIOTA
                      </p>
                      <p>
                        Exchange rate: 1 IOTA ={" "}
                        {swirlStat && swirlStat.ratio
                          ? swirlStat.ratio.toFixed(4)
                          : "..."}{" "}
                        stIOTA
                      </p>
                    </div>
                    <DialogFooter>
                      <Button
                        className="w-full"
                        disabled={isTransferring}
                        onClick={handleStake}
                      >
                        {isTransferring ? "Staking..." : "Stake"}
                      </Button>
                    </DialogFooter>
                  </Tabs.Panel>
                  <Tabs.Panel value="unstake" pt="md">
                    <div className="flex justify-end text-sm text-muted-foreground pr-1">
                      Balance: {stakedBalance ? Number(stakedBalance) : "0"}
                    </div>
                    <div className="relative mb-5">
                      <Input
                        type="number"
                        placeholder="Amount to Unstake"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="pr-12"
                        min={1}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                        onClick={() => setSendAmount(stakedBalance)}
                      >
                        Max
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground -mt-4 mb-5 px-1">
                      In smallest unit:{" "}
                      {new Intl.NumberFormat("en-US").format(
                        amountInSmallestUnit
                      )}
                      <p>
                        You will get: ~=
                        {swirlStat && swirlStat.ratio
                          ? (Number(sendAmount) / swirlStat.ratio).toFixed(4)
                          : "..."}{" "}
                        IOTA
                      </p>
                      <p>
                        Exchange rate: 1 stIOTA ={" "}
                        {swirlStat && swirlStat.ratio
                          ? (1 / swirlStat.ratio).toFixed(4)
                          : "..."}{" "}
                        IOTA
                      </p>
                    </div>
                    <DialogFooter>
                      <Button
                        className="w-full"
                        disabled={isTransferring}
                        onClick={handleUnstake}
                      >
                        {isTransferring ? "Unstaking..." : "Unstake"}
                      </Button>
                    </DialogFooter>
                  </Tabs.Panel>
                </Tabs>
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
