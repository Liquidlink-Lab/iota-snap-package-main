import { useAppStore } from "@/stores/app";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useSwirlStat = () => {
  const { network } = useAppStore();
  const { data: swirlStat, isLoading } = useQuery({
    queryKey: ["swirlStat"],
    queryFn: async () => {
      const response = await axios({
        method: "GET",
        url: `https://api.swirlstake.com/v1/stats`,
      });

      const data = response.data;
      if (data && data.ratio) {
        const rawRatio = Number(data.ratio);
        if (!isNaN(rawRatio)) {
          data.ratio = rawRatio / 10 ** 18;
        }
      }

      return data;
    },
    refetchInterval: 60000, // Refetch every minute
    enabled: network === "mainnet",
  });

  return { swirlStat, isLoading };
};

export default useSwirlStat;
