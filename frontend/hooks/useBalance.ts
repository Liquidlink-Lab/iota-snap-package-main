import { useIotaClientQuery } from "@iota/dapp-kit";

import usePrice from "./usePrice";

const useBalance = ({ address }: { address?: string | null }) => {
  const { data, isLoading, refetch, isFetching } = useIotaClientQuery(
    "getBalance",
    { owner: address as string },
    { refetchInterval: 15000, enabled: !!address }
  );
  const { price } = usePrice();
  const amount = data?.totalBalance
    ? formatUnitsBI(BigInt(data.totalBalance), 9)
    : "0";

  return {
    coinObjectCount: data?.coinObjectCount || 0,
    amount,
    price: format(price ?? 0, 9),
    usdValue: format(Number(amount) * (price || 0), 2),
    isLoading: address ? isLoading || isFetching : false,
    refetch,
  };
};

export default useBalance;

function format(balance: number, decimals: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(balance);
}

/**
 * 把最小單位的 BigInt 轉成人類可讀字串
 * @param raw
 * @param decimals
 * @returns
 */
export function formatUnitsBI(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);

  const intPart = raw / base; // 整數部份
  const fracPart = raw % base; // 餘數 = 小數部份

  if (fracPart === 0n) return intPart.toString(); // 沒小數

  const fracStr = fracPart // 左側補零
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, ""); // 去掉右邊多餘 0

  return `${intPart}.${fracStr}`;
}
