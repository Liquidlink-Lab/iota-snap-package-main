import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import useTx from "./useTx";
import { useAppStore } from "@/stores/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ActionLabel = "Stake" | "Unstake" | "Transfer";

export const useSend = () => {
  const account = useCurrentAccount();
  const { network } = useAppStore();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const tx = useTx();

  function requireAccount() {
    if (!account?.address) throw new Error("Please connect your wallet first");
    return account.address;
  }

  async function estimate(txBuilder: () => Promise<Transaction>) {
    const sender = requireAccount();
    const built = await txBuilder();
    return tx.estimateGas({ tx: built, sender });
  }

  /** 統一帶動作名稱的 execute：自動切換成功/失敗提示文案 */
  async function executeLabeled(
    action: ActionLabel,
    txBuilder: () => Promise<Transaction>
  ) {
    requireAccount();
    const built = await txBuilder();

    return await signAndExecute(
      {
        transaction: built,
        chain: `iota:${network}`,
      },
      {
        onSuccess: (result) => {
          const digest = result?.digest ?? "";
          const checkpoint = (result as any)?.checkpoint;
          console.log(`[${action}] executed`, { digest, checkpoint, result });

          toast.success(
            <div className="flex items-center gap-2">
              <span>
                {action} successful{digest ? ` · ${digest.slice(0, 8)}…` : ""}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `https://iotascan.com/${network}/tx/${digest}`,
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
          console.error(`[${action}] failed`, error);
          toast.error(`${action} failed`);
        },
      }
    );
  }

  return {
    // ========= 實際送出 =========
    sendAllNonIota: async ({
      coinType,
      recipient,
    }: {
      coinType: string;
      recipient: string;
    }) =>
      executeLabeled("Transfer", () =>
        tx.buildNonIotaSendAllPTB({
          owner: requireAccount(),
          coinType,
          recipient,
        })
      ),

    payAllIota: async ({ recipient }: { recipient: string }) =>
      executeLabeled("Transfer", () =>
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
      executeLabeled("Transfer", () =>
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
      executeLabeled("Transfer", () =>
        tx.buildIotaPayPTB({ owner: requireAccount(), recipient, amount })
      ),

    // ----- NativePool: stake / unstake -----
    /** 一鍵：從 IOTA 拆出 amount 後質押 */
    stakeWithSplit: async ({ amount }: { amount: bigint | number }) =>
      executeLabeled("Stake", () =>
        tx.buildStakeWithSplitPTB({ owner: requireAccount(), amount })
      ),

    /** 拆出指定 amount 的 CERT 後「部分」解質押 */
    unstakeWithSplit: async ({ amount }: { amount: bigint | number }) =>
      executeLabeled("Unstake", () =>
        tx.buildUnstakeWithSplitPTB({ owner: requireAccount(), amount })
      ),

    // ========= 只估 gas =========
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

    // ----- NativePool: gas estimate -----
    estimateStakeWithSplit: async ({ amount }: { amount: bigint | number }) =>
      estimate(() =>
        tx.buildStakeWithSplitPTB({ owner: requireAccount(), amount })
      ),

    estimateUnstakeWithSplit: async ({ amount }: { amount: bigint | number }) =>
      estimate(() =>
        tx.buildUnstakeWithSplitPTB({ owner: requireAccount(), amount })
      ),
  };
};
