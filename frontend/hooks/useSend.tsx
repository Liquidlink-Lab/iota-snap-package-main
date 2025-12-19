import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@iota/dapp-kit";
import type { Transaction } from "@iota/iota-sdk/transactions";
import useTx from "./useTx";
import { useAppStore } from "@/stores/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

type ActionLabel = "Stake" | "Unstake" | "Transfer";
type ExecuteOptions = { dryRun?: boolean };

export const useSend = () => {
  const account = useCurrentAccount();
  const { network } = useAppStore();
  const client = new IotaClient({url: getFullnodeUrl(network)});
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const tx = useTx();

  function requireAccount() {
    if (!account?.address) throw new Error("Please connect your wallet first");
    return account.address;
  }

  /** 統一帶動作名稱的 execute：自動切換成功/失敗提示文案 */
  async function executeLabeled(
    action: ActionLabel,
    txBuilder: (sender: string) => Promise<Transaction>,
    options?: ExecuteOptions
  ) {
    const sender = requireAccount();
    const built = await txBuilder(sender);

    if (options?.dryRun) {
      const unsignedTxBytesBase64 = await built.build({ client });
      const dryRun = await client.dryRunTransactionBlock({
        transactionBlock: unsignedTxBytesBase64,
      });
      console.log(`[dry-run][${action}] executed`, dryRun);
      toast.success("Dry-run completed, check console for details.");
      return;
    }

    return await signAndExecute(
      {
        transaction: built as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
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
      dryRun,
    }: {
      coinType: string;
      recipient: string;
      dryRun?: boolean;
    }) =>
      executeLabeled(
        "Transfer",
        (sender) => tx.payAllToken(sender, recipient, coinType),
        { dryRun }
      ),

    payAllIota: async ({
      recipient,
      dryRun,
    }: {
      recipient: string;
      dryRun?: boolean;
    }) =>
      executeLabeled("Transfer", (sender) => tx.payAllIota(sender, recipient), {
        dryRun,
      }),

    sendNonIota: async ({
      coinType,
      recipient,
      amount,
      dryRun,
    }: {
      coinType: string;
      recipient: string;
      amount: bigint | number;
      dryRun?: boolean;
    }) =>
      executeLabeled(
        "Transfer",
        (sender) => tx.payTokenAmount(sender, recipient, coinType, amount),
        { dryRun }
      ),

    sendIota: async ({
      recipient,
      amount,
      dryRun,
    }: {
      recipient: string;
      amount: bigint | number;
      dryRun?: boolean;
    }) =>
      executeLabeled(
        "Transfer",
        (sender) => tx.payIotaAmount(sender, recipient, amount),
        { dryRun }
      ),

    // ----- NativePool: stake / unstake -----
    /** 一鍵：從 IOTA 拆出 amount 後質押 */
    stakeWithSplit: async ({
      amount,
      dryRun,
    }: {
      amount: bigint | number;
      dryRun?: boolean;
    }) => {
      return executeLabeled(
        "Stake",
        (sender) => tx.buildStakeWithSplitPTB({ owner: sender, amount }),
        { dryRun }
      );
    },

    /** 拆出指定 amount 的 CERT 後「部分」解質押 */
    unstakeWithSplit: async ({
      amount,
      dryRun,
    }: {
      amount: bigint | number;
      dryRun?: boolean;
    }) => {
      return executeLabeled(
        "Unstake",
        (sender) => tx.buildUnstakeWithSplitPTB({ owner: sender, amount }),
        { dryRun }
      );
    },
  };
};
