"use client";

import Image from "next/image";
import { Select } from "@mantine/core";
import { useAppStore } from "@/stores/app";
import { ThemeToggle } from "./theme-toggle";
import { useCurrentWallet } from "@iota/dapp-kit";

export const Hero = () => {
  const { network, setNetwork } = useAppStore();
  const { isConnected } = useCurrentWallet();
  const handleNetworkChange = (value: string | null) => {
    if (value !== null) {
      setNetwork(value);
    }
  };

  return (
    <>
      <div className="flex w-full justify-end gap-4">
        <Select
          size="sm"
          value={network}
          onChange={handleNetworkChange}
          data={["mainnet", "testnet"]}
          w="100"
          radius="md"
        />
        <ThemeToggle />
      </div>
      <Image
        className="dark:invert"
        src="/Iota_logo.svg"
        alt="IOTA Logo"
        width={280}
        height={80}
        priority
      />
      <h1 className="text-3xl font-bold mt-8 mb-4">Iota Snap Wallet</h1>
      {isConnected && (
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          Using wallet by MetaMask, designed and developed by Liquidlink.
        </p>
      )}
    </>
  );
};
