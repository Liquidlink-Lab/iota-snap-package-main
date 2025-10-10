import { useIotaClientQueries, useIotaClientQuery } from "@iota/dapp-kit";

type CoinRow = {
  coinType: string;
  totalBalance: string; // stringified bigint
};

const useTokens = ({ address }: { address: string }) => {
  const {
    data: balancesData,
    refetch,
    isFetching,
  } = useIotaClientQuery(
    "getAllBalances",
    { owner: address },
    { refetchInterval: 15000, enabled: !!address }
  );

  const rows: CoinRow[] = (balancesData ?? []).map((b) => ({
    coinType: b.coinType,
    totalBalance: b.totalBalance,
  }));

  const metaQueries = useIotaClientQueries({
    queries: rows.map((r) => ({
      method: "getCoinMetadata",
      params: { coinType: r.coinType },
      options: {
        queryKey: ["coinMeta", r.coinType],
        staleTime: 60 * 60 * 1000, // 1 小時
      },
    })),
  });

  const tokens = rows
    .map((r, i) => {
      const meta = metaQueries[i]?.data ?? null;
      const decimals = meta?.decimals ?? 0;
      const balance = formatUnits(r.totalBalance);
      return {
        coinType: r.coinType,
        symbol: meta?.symbol,
        name: meta?.name,
        iconUrl: meta?.iconUrl ?? null,
        balance,
        decimals,
      };
    })
    .sort((a, b) => (a.symbol ?? "").localeCompare(b.symbol ?? ""));

  return { tokens, refetch, isFetching };
};

export default useTokens;

function formatUnits(amount: string, decimals = 9) {
  if (amount === "0") return "0";
  const s = amount.padStart(decimals + 1, "0");
  const intPart = s.slice(0, -decimals);
  let fracPart = s.slice(-decimals).replace(/0+$/, "");
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}
