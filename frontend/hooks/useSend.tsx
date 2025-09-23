import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import useTx from "./useTx";
import { useAppStore } from "@/stores/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const useSend = () => {
  const account = useCurrentAccount();
  const { network } = useAppStore();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const tx = useTx();

  function requireAccount() {
    if (!account?.address) throw new Error("請先連接錢包");
    return account.address;
  }

  async function estimate(txBuilder: () => Promise<Transaction>) {
    const sender = requireAccount();
    const built = await txBuilder();
    return tx.estimateGas({ tx: built, sender });
  }

  async function execute(txBuilder: () => Promise<Transaction>) {
    requireAccount();
    const built = await txBuilder();
    // 交給 dapp-kit 進行 build + 簽名 + 送出
    return await signAndExecute(
      {
        transaction: built,
        chain: `iota:${network}`,
      },
      {
        onSuccess: (result) => {
          console.log("executed transaction", result);
          toast.success(
            <div className="flex items-center gap-2">
              <span>Transaction executed successfully</span>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `https://explorer.iota.org/txblock/${result.digest}?network=${network}`,
                    "_blank"
                  )
                }
              >
                View on Explorer
              </Button>
            </div>
          );
        },
        onError: (error) => {
          console.error(error);
          toast.error("Transaction failed");
        },
      }
    );
  }

  return {
    // 實際送出
    sendAllNonIota: async ({
      coinType,
      recipient,
    }: {
      coinType: string;
      recipient: string;
    }) =>
      execute(() =>
        tx.buildNonIotaSendAllPTB({
          owner: requireAccount(),
          coinType,
          recipient,
        })
      ),

    payAllIota: async ({ recipient }: { recipient: string }) =>
      execute(() =>
        tx.buildIotaPayAllLikePTB({ owner: requireAccount(), recipient })
      ),

    sendNonIota: async ({
      coinType,
      recipient,
      amount,
    }: {
      coinType: string;
      recipient: string;
      amount: bigint | number;
    }) =>
      execute(() =>
        tx.buildNonIotaPayPTB({
          owner: requireAccount(),
          coinType,
          recipient,
          amount,
        })
      ),

    sendIota: async ({
      recipient,
      amount,
    }: {
      recipient: string;
      amount: bigint | number;
    }) =>
      execute(() =>
        tx.buildIotaPayPTB({ owner: requireAccount(), recipient, amount })
      ),

    // 只估 gas（不送出）
    estimateSendAllNonIota: async ({
      coinType,
      recipient,
    }: {
      coinType: string;
      recipient: string;
    }) =>
      estimate(() =>
        tx.buildNonIotaSendAllPTB({
          owner: requireAccount(),
          coinType,
          recipient,
        })
      ),

    estimatePayAllIota: async ({ recipient }: { recipient: string }) =>
      estimate(() =>
        tx.buildIotaPayAllLikePTB({ owner: requireAccount(), recipient })
      ),

    estimateSendNonIota: async ({
      coinType,
      recipient,
      amount,
    }: {
      coinType: string;
      recipient: string;
      amount: bigint | number;
    }) =>
      estimate(() =>
        tx.buildNonIotaPayPTB({
          owner: requireAccount(),
          coinType,
          recipient,
          amount,
        })
      ),

    estimateSendIota: async ({
      recipient,
      amount,
    }: {
      recipient: string;
      amount: bigint | number;
    }) =>
      estimate(() =>
        tx.buildIotaPayPTB({ owner: requireAccount(), recipient, amount })
      ),
  };
};
