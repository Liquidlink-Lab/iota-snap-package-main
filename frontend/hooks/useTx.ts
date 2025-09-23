import { Transaction } from "@iota/iota-sdk/transactions";
import { CoinStruct } from "@iota/iota-sdk/client";
import { useIotaClient } from "@iota/dapp-kit";
import { BASE_TOKEN_TYPE } from "@/lib/config";

// ===== useTx =====
const useTx = () => {
  const client = useIotaClient();

  /** 取得 owner 的指定 coinType 所有 coin（自動分頁） */
  async function getAllCoinsOfType(owner: string, type: string) {
    const all: CoinStruct[] = [] as any;
    let cursor: string | null = null;
    do {
      const page = await client.getCoins({
        owner,
        coinType: type,
        cursor,
        limit: 50,
      });
      all.push(...page.data);
      cursor = page.hasNextPage ? (page.nextCursor as string | null) : null;
    } while (cursor);
    return all;
  }

  /** greedy 揀幣（不足會 throw） */
  function selectCoinsForAmount(coins: CoinStruct[], targetAmount: bigint) {
    let sum = 0n;
    const picked: CoinStruct[] = [];
    for (const c of coins) {
      picked.push(c);
      sum += BigInt(c.balance);
      if (sum >= targetAmount) return { picked, total: sum };
    }
    throw new Error("Insufficient balance");
  }

  /** 非基礎幣：把該幣種所有 coins 合併成一顆並整顆轉出（send-all） */
  async function buildNonIotaSendAllPTB({
    owner,
    recipient,
    coinType,
  }: {
    owner: string;
    recipient: string;
    coinType: string;
  }) {
    const coins = await getAllCoinsOfType(owner, coinType);
    if (!coins.length) throw new Error(`You have no ${coinType} to send`);

    const tx = new Transaction();
    const primary = tx.object(coins[0].coinObjectId);
    const sources = coins.slice(1).map((c) => tx.object(c.coinObjectId));
    if (sources.length > 0) tx.mergeCoins(primary, sources);
    tx.transferObjects([primary], tx.pure.address(recipient));
    return tx;
  }

  /** 基礎幣：重現 pay-all（扣 gas 後全部送出） */
  async function buildIotaPayAllLikePTB({
    owner,
    recipient,
  }: {
    owner: string;
    recipient: string;
  }) {
    const baseCoins = await getAllCoinsOfType(owner, BASE_TOKEN_TYPE);
    if (baseCoins.length === 0)
      throw new Error("No available base coins to send");

    const tx = new Transaction();
    tx.setGasPayment(
      baseCoins.map((c) => ({
        objectId: c.coinObjectId,
        version: c.version,
        digest: c.digest,
      }))
    );
    const others = baseCoins.slice(1).map((c) => tx.object(c.coinObjectId));
    if (others.length > 0) tx.mergeCoins(tx.gas, others);
    tx.transferObjects([tx.gas], tx.pure.address(recipient));
    return tx;
  }

  /** 非基礎幣的一般轉帳（單收款人）：轉出指定金額；找零留在 sender */
  async function buildNonIotaPayPTB({
    owner,
    coinType,
    recipient,
    amount,
  }: {
    owner: string;
    coinType: string;
    recipient: string;
    amount: bigint | number;
  }) {
    const amt = BigInt(amount);
    if (amt <= 0n)
      throw new Error("amount must be a positive integer (in smallest units)");

    const coins = await getAllCoinsOfType(owner, coinType);
    if (!coins.length) throw new Error(`You do not have ${coinType}`);

    const sorted = [...coins].sort((a, b) =>
      Number(BigInt(b.balance) - BigInt(a.balance))
    );
    const { picked } = selectCoinsForAmount(sorted, amt);

    const tx = new Transaction();
    const primary = tx.object(picked[0].coinObjectId);
    const sources = picked.slice(1).map((c) => tx.object(c.coinObjectId));
    if (sources.length > 0) tx.mergeCoins(primary, sources);

    const [out] = tx.splitCoins(primary, [tx.pure.u64(amt)]);
    tx.transferObjects([out], tx.pure.address(recipient));
    return tx;
  }

  /** 基礎幣的一般轉帳（單收款人）：從基礎幣 split 指定金額轉出；找零留在 sender */
  async function buildIotaPayPTB({
    owner,
    recipient,
    amount,
  }: {
    owner: string;
    recipient: string;
    amount: bigint | number;
  }) {
    const amt = BigInt(amount);
    if (amt <= 0n) throw new Error("amount must be a positive integer");

    const baseCoins = await getAllCoinsOfType(owner, BASE_TOKEN_TYPE);
    if (!baseCoins.length) throw new Error("No base coins");

    const sorted = [...baseCoins].sort((a, b) =>
      Number(BigInt(b.balance) - BigInt(a.balance))
    );
    const { picked } = selectCoinsForAmount(sorted, amt);

    const tx = new Transaction();
    tx.setGasPayment(
      picked.map((c) => ({
        objectId: c.coinObjectId,
        version: c.version,
        digest: c.digest,
      }))
    );
    const others = picked.slice(1).map((c) => tx.object(c.coinObjectId));
    if (others.length > 0) tx.mergeCoins(tx.gas, others);

    const [out] = tx.splitCoins(tx.gas, [tx.pure.u64(amt)]);
    tx.transferObjects([out], tx.pure.address(recipient));
    return tx;
  }

  /** 預估 gas：把 Transaction build 成 bytes 後 dry-run（修正型別錯誤） */
  async function estimateGas({
    tx,
    sender,
  }: {
    tx: Transaction;
    sender?: string;
  }) {
    if (sender) tx.setSender(sender);

    const refGasPrice = await client.getReferenceGasPrice();

    // 將 Transaction build 成 BCS bytes（或 tx.serialize() 視 SDK 版本而定）
    const bytes = await tx.build({ client });

    // dryRunTransactionBlock 需要 string | Uint8Array，而不是 Transaction
    const dry = await client.dryRunTransactionBlock({
      transactionBlock: bytes,
    });

    const gasUsed: any = dry.effects?.gasUsed ?? dry.effects?.gasUsed;
    if (!gasUsed)
      return { refGasPrice, total: undefined, breakdown: undefined, dry };

    const computation = BigInt(
      gasUsed.computationCost ?? gasUsed.computation ?? 0
    );
    const storageCost = BigInt(gasUsed.storageCost ?? 0);
    const storageRebate = BigInt(gasUsed.storageRebate ?? 0);

    const total = computation + storageCost - storageRebate;

    return {
      refGasPrice,
      total,
      breakdown: { computation, storageCost, storageRebate },
      dry,
    };
  }

  return {
    // send-all
    buildIotaPayAllLikePTB,
    buildNonIotaSendAllPTB,

    // 一般轉帳（單收款人）
    buildIotaPayPTB,
    buildNonIotaPayPTB,

    // 工具
    estimateGas,
    getAllCoinsOfType,
  };
};

export default useTx;
