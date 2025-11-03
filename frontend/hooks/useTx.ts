import { ObjectRef, Transaction } from "@iota/iota-sdk/transactions";
import { useIotaClient } from "@iota/dapp-kit";
import {
  BASE_TOKEN_TYPE,
  NATIVE_POOL_PACKAGE,
  NATIVE_POOL_MODULE,
  NATIVE_POOL_ID,
  CERT_METADATA_ID,
  CERT_COIN_TYPE,
  SYSTEM_STATE_OBJECT_ID,
} from "@/lib/config";

const MIN_GAS_BUDGET = 1_000_000n; // 0.001 IOTA
const MAX_GAS_BUDGET = 50_000_000_000n; // Network-enforced upper bound

// ===== useTx =====
const useTx = () => {
  const client = useIotaClient();

  /** 取某人擁有的指定 coinType 的所有 coin 物件 ID */
  async function getCoins(owner: string, coinType: string, pageLimit = 100) {
    const coins: (ObjectRef & { balance: bigint })[] = [];
    let cursor: string | null = null;
    do {
      const page = await client.getCoins({
        owner,
        coinType,
        cursor: cursor ?? undefined,
        limit: pageLimit,
      });
      coins.push(
        ...page.data.map((c) => {
          return {
            objectId: c.coinObjectId,
            version: c.version,
            digest: c.digest,
            balance: BigInt(c.balance ?? 0),
          };
        })
      );
      cursor = typeof page.nextCursor === "string" ? page.nextCursor : null;
    } while (cursor);
    coins.sort((a, b) =>
      a.balance === b.balance ? 0 : a.balance < b.balance ? 1 : -1
    );

    return coins;
  }

  const toObjectRef = (coin: ObjectRef & { balance: bigint }): ObjectRef => ({
    objectId: coin.objectId,
    version: coin.version,
    digest: coin.digest,
  });

  const toObjectRefs = (coins: (ObjectRef & { balance: bigint })[]) =>
    coins.map(toObjectRef);

  /** 查餘額（最小單位） */
  async function getBalance(owner: string, coinType: string): Promise<bigint> {
    const r = await client.getBalance({ owner, coinType });
    return BigInt(r.totalBalance ?? 0);
  }

  /** 準備 gas：找原生幣並放進 GasPayment（至少要有一顆） */
  async function prepareGas(tx: Transaction, owner: string) {
    const gasCoins = await getCoins(owner, BASE_TOKEN_TYPE);
    if (gasCoins.length === 0) {
      throw new Error("No available IOTA to pay gas.");
    }
    tx.setGasPayment(toObjectRefs(gasCoins));
  }

  /** Sweep：把全部 IOTA（扣手續費）給 recipient */
  async function payAllIota(sender: string, recipient: string) {
    // 收集原生幣（要被合併並在最後整顆轉走）
    const coins = await getCoins(sender, BASE_TOKEN_TYPE);
    if (coins.length === 0) throw new Error("No available IOTA coin.");

    const [primary, ...rest] = coins;

    const tx = new Transaction();
    tx.setSender(sender);

    // 1) Gas 只放一顆
    tx.setGasPayment([toObjectRef(primary)]);

    // 2) 顯式把所有原生幣合併到 gas（確保 sweep 的語意）
    if (rest.length > 0) {
      tx.mergeCoins(
        tx.gas, // 目標：gas coin
        rest.map((c) => tx.object(c.objectId)) // 來源：其他原生幣
      );
    }

    // 3) 把「合併後的整顆 gas」轉給收款人（收到 = 全部餘額 - 本筆 gas 費）
    tx.transferObjects([tx.gas], recipient);

    return tx;
  }

  /** 指定金額轉帳：自動合併→拆分→轉帳；找零留在錢包 */
  async function payIotaAmount(
    sender: string,
    recipient: string,
    amount: bigint | number | string // 最小單位
  ) {
    const want = BigInt(amount);
    if (want <= 0n) throw new Error("Amount must be greater than 0.");

    const bal = await getBalance(sender, BASE_TOKEN_TYPE);
    if (bal <= 0n) throw new Error("Balance is 0.");
    if (bal < want)
      throw new Error(
        `Insufficient balance: available=${bal}, required=${want}.`
      );

    const coins = await getCoins(sender, BASE_TOKEN_TYPE);
    const [primary, ...rest] = coins;

    const tx = new Transaction();
    tx.setSender(sender);

    // 1) 只放主 coin 作為 gas
    tx.setGasPayment([toObjectRef(primary)]);

    // 2) 先把其他原生幣合併到 gas，確保可拆出 want
    if (rest.length > 0) {
      tx.mergeCoins(
        tx.gas,
        rest.map((r) => tx.object(r.objectId))
      );
    }

    // 3) 從 gas 拆出指定金額，然後把這顆轉給收款人
    const [out] = tx.splitCoins(tx.gas, [tx.pure.u64(want)]);
    tx.transferObjects([out], recipient);

    return tx;
  }

  /** 轉帳：把「指定代幣」的全部餘額轉給收款人（gas 由原生幣支付） */
  async function payAllToken(
    sender: string,
    recipient: string,
    coinType: string
  ) {
    const coins = await getCoins(sender, coinType);
    if (coins.length === 0) {
      throw new Error(`No available coin for type ${coinType}.`);
    }

    const tx = new Transaction();
    tx.setSender(sender);

    // 1) 準備 gas
    await prepareGas(tx, sender);

    // 2) 合併目標代幣：把所有 token coin 併成一顆
    const [primary, ...rest] = coins;
    if (rest.length > 0) {
      tx.mergeCoins(
        tx.object(primary.objectId),
        rest.map((c) => tx.object(c.objectId))
      );
    }

    // 3) 轉出這顆（等於整個餘額）到收款人
    tx.transferObjects([tx.object(primary.objectId)], recipient);

    return tx;
  }

  /** 轉帳：把「指定代幣」的指定金額轉給收款人（會自動合併→拆分；找零留在原地址） */
  async function payTokenAmount(
    sender: string,
    recipient: string,
    coinType: string,
    amount: bigint | number | string // 最小單位
  ) {
    const want = BigInt(amount);
    if (want <= 0n) throw new Error("Amount must be greater than 0.");

    const bal = await getBalance(sender, coinType);
    if (bal < want)
      throw new Error(
        `Insufficient balance: available=${bal}, required=${want}.`
      );

    const coins = await getCoins(sender, coinType);
    if (coins.length === 0)
      throw new Error(`No coin found for type ${coinType}.`);

    const tx = new Transaction();
    tx.setSender(sender);

    // 1) 準備 gas
    await prepareGas(tx, sender);

    // 2) 先把「目標代幣」合併成一顆，確保足以 split 想要的金額
    const [primary, ...rest] = coins;
    if (rest.length > 0) {
      tx.mergeCoins(
        tx.object(primary.objectId),
        rest.map((c) => tx.object(c.objectId))
      );
    }

    // 3) 從合併後的 token 主幣 split 出「指定金額」，其餘保留在 sender（找零）
    const [out] = tx.splitCoins(tx.object(primary.objectId), [
      tx.pure.u64(want),
    ]);

    // 4) 把剛拆出的這顆轉給收款人
    tx.transferObjects([out], recipient);

    return tx;
  }

  /** ====== Native Pool: 一鍵切幣後 stake（同一筆 TX）
   * 參照 payIotaAmount（目標幣 = 原生幣）
   * 流程：
   * 1) 檢查 base 總餘額；若 amount >= (balance - MIN_GAS_BUDGET) 則視為 send-all-minus-gas
   * 2) 取所有 base coins，最大顆設為 gas，其餘合併到 tx.gas
   * 3) 從 tx.gas split 出 stake 金額
   * 4) （可選）設定 gasBudget（不高於剩餘且不超過 MAX_GAS_BUDGET）
   * 5) 呼叫 stake(...)
   */
  async function buildStakeWithSplitPTB({
    owner,
    amount,
  }: {
    owner: string;
    amount: bigint | number; // IOTA 最小單位
  }) {
    const amt = BigInt(amount);
    if (amt <= 0n) throw new Error("Amount must be greater than 0.");

    // 1) 取得 base coins 並檢查總餘額
    const baseRefs = await getCoins(owner, BASE_TOKEN_TYPE);
    if (baseRefs.length === 0) throw new Error("No base coins available.");

    const totalBase = baseRefs.reduce((sum, coin) => sum + coin.balance, 0n);
    if (totalBase < amt + MIN_GAS_BUDGET) {
      throw new Error(
        `Not enough IOTA to cover stake amount plus minimum gas reserve (0.001 IOTA)`
      );
    }

    // 2) 準備所有 base coins：最大顆作 gas，其餘合併到 tx.gas
    const [primary, ...rest] = baseRefs;
    const primaryBalance = primary.balance;

    const tx = new Transaction();
    tx.setSender(owner);

    // Gas 只放一顆（ObjectRef），接下來對 gas 的任何操作一律用 tx.gas
    tx.setGasPayment([
      {
        objectId: primary.objectId,
        digest: primary.digest,
        version: primary.version,
      },
    ]);

    // 合併其餘 base coins 到 tx.gas
    if (rest.length > 0) {
      tx.mergeCoins(
        tx.gas,
        rest.map((c) => tx.object(c.objectId))
      );
    }

    // 3) 從 tx.gas 拆出 stake 金額（其餘 + 手續費留在 tx.gas）
    const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amt)]);

    // 4) 設定 gasBudget（可讓錢包估算，不設也可；若要手動設，遵守上下限）
    //    這裡用「可用剩餘」作為上限，封頂 MAX_GAS_BUDGET；不足則由節點/錢包估算。
    const remainder = totalBase - amt;
    const candidateBudget =
      remainder > MAX_GAS_BUDGET ? MAX_GAS_BUDGET : remainder;
    const safeBudget =
      candidateBudget > primaryBalance ? primaryBalance : candidateBudget;
    if (safeBudget < MIN_GAS_BUDGET) {
      throw new Error(
        "Insufficient IOTA remaining in the gas coin to satisfy the minimum gas reserve after staking."
      );
    }
    if (safeBudget >= MIN_GAS_BUDGET) {
      tx.setGasBudget(safeBudget);
    }

    // 5) 呼叫 stake
    tx.moveCall({
      target: `${NATIVE_POOL_PACKAGE}::${NATIVE_POOL_MODULE}::stake`,
      arguments: [
        tx.object(NATIVE_POOL_ID),
        tx.object(CERT_METADATA_ID),
        tx.object(SYSTEM_STATE_OBJECT_ID),
        stakeCoin,
      ],
    });

    return tx;
  }
  async function buildUnstakeWithSplitPTB({
    owner,
    amount,
  }: {
    owner: string;
    amount: bigint | number; // CERT 最小單位
  }) {
    const amt = BigInt(amount);
    if (amt <= 0n) throw new Error("Amount must be greater than 0.");

    // 1) 檢查 CERT 總餘額
    const totalCert = await getBalance(owner, CERT_COIN_TYPE);
    if (totalCert < amt) {
      throw new Error(
        `Not enough CERT to cover requested unstake amount: need ${amt}, have ${totalCert}.`
      );
    }

    // 2) 準備 gas（用 base coin；只放一顆）
    const tx = new Transaction();
    tx.setSender(owner);
    await prepareGas(tx, owner); // 內部只會放一顆 base coin 進 setGasPayment

    // 3) 合併所有 CERT 成一顆 primary
    const certRefs = await getCoins(owner, CERT_COIN_TYPE);
    if (certRefs.length === 0) {
      throw new Error("You have no CERT coins to unstake.");
    }
    const [primaryCert, ...restCert] = certRefs;

    if (restCert.length > 0) {
      tx.mergeCoins(
        tx.object(primaryCert.objectId),
        restCert.map((c) => tx.object(c.objectId))
      );
    }

    // 4) 從 primary split 出要解質押的 certOut
    const [certOut] = tx.splitCoins(tx.object(primaryCert.objectId), [
      tx.pure.u64(amt),
    ]);

    // 5) 呼叫 unstake
    tx.moveCall({
      target: `${NATIVE_POOL_PACKAGE}::${NATIVE_POOL_MODULE}::unstake`,
      arguments: [
        tx.object(NATIVE_POOL_ID),
        tx.object(SYSTEM_STATE_OBJECT_ID),
        tx.object(CERT_METADATA_ID),
        certOut,
      ],
    });

    return tx;
  }

  return {
    payAllIota,
    payIotaAmount,
    payAllToken,
    payTokenAmount,

    // Swirl
    buildStakeWithSplitPTB,
    buildUnstakeWithSplitPTB,
  };
};

export default useTx;
