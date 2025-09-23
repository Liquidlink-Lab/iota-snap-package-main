import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const usePrice = () => {
  const { data: price, isLoading } = useQuery({
    queryKey: ["price"],

    queryFn: async () => {
      const response = await axios({
        method: "GET",
        url: `https://api.coingecko.com/api/v3/simple/price?ids=iota&vs_currencies=usd`,
      });

      const responseData = response.data as { [key: string]: { usd: number } };

      return responseData.iota.usd;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  return { price, isLoading };
};

export default usePrice;
