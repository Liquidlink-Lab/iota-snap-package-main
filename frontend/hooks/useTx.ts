import { Transaction } from "@iota/iota-sdk/transactions";
import { CoinStruct } from "@iota/iota-sdk/client";
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

  /** 非基礎幣的一般轉帳（單收款人） */
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
    if (amt <= 0n) throw new Error("amount must be a positive integer");

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

  /** 基礎幣的一般轉帳（單收款人） */
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

  /** ====== Native Pool: stake (使用 config 常數) ======
   * stake(NativePool, Metadata<CERT>, IotaSystemState(0x5), Coin<IOTA>)
   * 直接傳入 iotaCoinId（已切好數量的 IOTA coin）
   */
  async function buildStakePTB({ iotaCoinId }: { iotaCoinId: string }) {
    const tx = new Transaction();
    tx.moveCall({
      target: `${NATIVE_POOL_PACKAGE}::${NATIVE_POOL_MODULE}::stake`,
      arguments: [
        tx.object(NATIVE_POOL_ID),
        tx.object(CERT_METADATA_ID),
        tx.object(SYSTEM_STATE_OBJECT_ID),
        tx.object(iotaCoinId),
      ],
    });
    return tx;
  }

  /** ====== Native Pool: 一鍵切幣後 stake（同一筆 TX） ======
   * 流程：
   * 1) 用「非 gas 的 IOTA coins」先組出 primary
   * 2) split 出 amount 形成 stakeCoin
   * 3) 呼叫 stake(..., stakeCoin)
   * 備註：若只有 1 顆 IOTA coin，會 fallback 用 gas 當來源，但可能造成 gas 不足。
   */
  async function buildStakeWithSplitPTB({
    owner,
    amount,
  }: {
    owner: string;
    amount: bigint | number; // IOTA 最小單位
  }) {
    const amt = BigInt(amount);
    if (amt < 1000000000n) throw new Error("minimum amount: 1 IOTA");

    const baseCoins = await getAllCoinsOfType(owner, BASE_TOKEN_TYPE);
    if (baseCoins.length === 0) throw new Error("No base coins");

    // 依餘額大→小排序，預設用第一顆當 gas
    const sorted = [...baseCoins].sort((a, b) =>
      Number(BigInt(b.balance) - BigInt(a.balance))
    );

    const tx = new Transaction();

    if (sorted.length >= 2) {
      // === 推薦路徑：gas 與來源分離 ===
      // 1) 設定 gas（僅使用最大那顆；你也可以改成多顆）
      const [gasCoin, ...candidates] = sorted;
      tx.setGasPayment([
        {
          objectId: gasCoin.coinObjectId,
          version: gasCoin.version,
          digest: gasCoin.digest,
        },
      ]);

      // 2) 從非 gas 候選中挑到足額的來源
      const { picked } = selectCoinsForAmount(candidates, amt);

      const primary = tx.object(picked[0].coinObjectId);
      const sources = picked.slice(1).map((c) => tx.object(c.coinObjectId));
      if (sources.length > 0) tx.mergeCoins(primary, sources);

      // 3) split 出 stake 金額
      const [stakeCoin] = tx.splitCoins(primary, [tx.pure.u64(amt)]);

      // 4) 呼叫 stake
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

    // === 備用路徑：只有 1 顆 IOTA coin，gas 與來源同一顆 ===
    const only = sorted[0];
    tx.setGasPayment([
      {
        objectId: only.coinObjectId,
        version: only.version,
        digest: only.digest,
      },
    ]);

    // 以 gas coin 當來源 split（注意需預留 gas，否則可能失敗）
    if (BigInt(only.balance) <= amt) {
      throw new Error(
        "Single base coin is not enough to cover amount + gas. Get another IOTA coin or reduce amount."
      );
    }

    const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amt)]);
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

  /** ====== Native Pool: unstake（使用 config 常數） ======
   * unstake(NativePool, IotaSystemState(0x5), Metadata<CERT>, Coin<CERT>)
   */
  async function buildUnstakePTB({ certCoinId }: { certCoinId: string }) {
    const tx = new Transaction();
    tx.moveCall({
      target: `${NATIVE_POOL_PACKAGE}::${NATIVE_POOL_MODULE}::unstake`,
      arguments: [
        tx.object(NATIVE_POOL_ID),
        tx.object(SYSTEM_STATE_OBJECT_ID),
        tx.object(CERT_METADATA_ID),
        tx.object(certCoinId),
      ],
    });
    return tx;
  }

  /** ====== Native Pool: 一鍵合併所有 CERT 後解質押（同一筆 TX） ======
   * 1) 取出所有 Coin<CERT>，合併成一顆
   * 2) 以 IOTA Base coins 設 gas（與 CERT 分離，避免燃料衝突）
   * 3) 呼叫 unstake(NativePool, 0x5, Metadata<CERT>, mergedCert)
   */
  async function buildUnstakeWithMergePTB({ owner }: { owner: string }) {
    // 1) 取得 CERT coins
    const certCoins = await getAllCoinsOfType(owner, CERT_COIN_TYPE);
    if (certCoins.length === 0)
      throw new Error("You have no CERT coins to unstake");

    // 2) 取得 IOTA base coins 當 gas
    const baseCoins = await getAllCoinsOfType(owner, BASE_TOKEN_TYPE);
    if (baseCoins.length === 0) {
      throw new Error("No base coins for gas. Get some IOTA to pay gas first.");
    }

    // 依餘額大→小排序；最大那顆拿來當 gas
    const gasCandidate = [...baseCoins].sort((a, b) =>
      Number(BigInt(b.balance) - BigInt(a.balance))
    )[0];

    const tx = new Transaction();
    tx.setGasPayment([
      {
        objectId: gasCandidate.coinObjectId,
        version: gasCandidate.version,
        digest: gasCandidate.digest,
      },
    ]);

    // 3) 將所有 CERT 合併成一顆
    const primary = tx.object(certCoins[0].coinObjectId);
    const rest = certCoins.slice(1).map((c) => tx.object(c.coinObjectId));
    if (rest.length > 0) tx.mergeCoins(primary, rest);

    // 4) 呼叫 unstake
    tx.moveCall({
      target: `${NATIVE_POOL_PACKAGE}::${NATIVE_POOL_MODULE}::unstake`,
      arguments: [
        tx.object(NATIVE_POOL_ID),
        tx.object(SYSTEM_STATE_OBJECT_ID), // 0x5
        tx.object(CERT_METADATA_ID),
        primary,
      ],
    });

    return tx;
  }

  /** ====== Native Pool: 依 amount 拆分後解質押（同一筆 TX） ======
   * 流程：
   * 1) 取得所有 Coin<CERT>，挑出足額的幾顆並合併成 primary
   * 2) 從 primary split 出「amount」大小的 certOut
   * 3) 以 IOTA Base coin 設 gas（與 CERT 分離）
   * 4) 呼叫 unstake(NATIVE_POOL_ID, 0x5, CERT_METADATA_ID, certOut)
   */
  async function buildUnstakeWithSplitPTB({
    owner,
    amount,
  }: {
    owner: string;
    amount: bigint | number; // CERT 的最小單位數量
  }) {
    const amt = BigInt(amount);
    if (amt < 1000000000n) throw new Error("minimum amount: 1 stIOTA");

    // 1) 取得 CERT coins
    const certCoins = await getAllCoinsOfType(owner, CERT_COIN_TYPE);
    if (certCoins.length === 0)
      throw new Error("You have no CERT coins to unstake");

    // 依餘額大→小排序，貪婪挑到足額
    const sortedCert = [...certCoins].sort((a, b) =>
      Number(BigInt(b.balance) - BigInt(a.balance))
    );
    const { picked } = selectCoinsForAmount(sortedCert, amt);

    // 2) 取得 IOTA base coins 當 gas
    const baseCoins = await getAllCoinsOfType(owner, BASE_TOKEN_TYPE);
    if (baseCoins.length === 0) {
      throw new Error("No base coins for gas. Get some IOTA to pay gas first.");
    }
    const gasCoin = [...baseCoins].sort((a, b) =>
      Number(BigInt(b.balance) - BigInt(a.balance))
    )[0];

    const tx = new Transaction();

    // 設 gas（只用最大那顆）
    tx.setGasPayment([
      {
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
        digest: gasCoin.digest,
      },
    ]);

    // 把挑到的 CERT 合併成一顆 primary
    const primary = tx.object(picked[0].coinObjectId);
    const rest = picked.slice(1).map((c) => tx.object(c.coinObjectId));
    if (rest.length > 0) tx.mergeCoins(primary, rest);

    // 從 primary split 出要解質押的 certOut（其餘留在帳上）
    const [certOut] = tx.splitCoins(primary, [tx.pure.u64(amt)]);

    // 呼叫 unstake( NativePool, 0x5, Metadata<CERT>, certOut )
    tx.moveCall({
      target: `${NATIVE_POOL_PACKAGE}::${NATIVE_POOL_MODULE}::unstake`,
      arguments: [
        tx.object(NATIVE_POOL_ID),
        tx.object(SYSTEM_STATE_OBJECT_ID), // 0x5
        tx.object(CERT_METADATA_ID),
        certOut,
      ],
    });

    return tx;
  }

  /** 預估 gas（dry-run） */
  async function estimateGas({
    tx,
    sender,
  }: {
    tx: Transaction;
    sender?: string;
  }) {
    if (sender) tx.setSender(sender);
    const refGasPrice = await client.getReferenceGasPrice();
    const bytes = await tx.build({ client });
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

    // NativePool
    buildStakePTB,
    buildStakeWithSplitPTB,
    buildUnstakePTB,
    buildUnstakeWithMergePTB,
    buildUnstakeWithSplitPTB,

    // 工具
    estimateGas,
    getAllCoinsOfType,
    selectCoinsForAmount,
  };
};

export default useTx;
