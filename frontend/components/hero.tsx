"use client";

import Image from "next/image";
import { Group, Select } from "@mantine/core";
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
      <Group justify="space-between" w="100%" mb="xl">
        <Group>
          <Image
            src="/iota-snap-logo.png"
            alt="IOTA Logo"
            width={32}
            height={32}
            priority
          />
          <h1 className="text-xl font-bold">IOTA Snap Wallet</h1>
        </Group>
        <Group className="gap-4">
          <Select
            size="sm"
            value={network}
            onChange={handleNetworkChange}
            data={["mainnet", "testnet"]}
            w="100"
            radius="md"
          />
          <ThemeToggle />
        </Group>
      </Group>
      {isConnected && (
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          Experience seamless access with a MetaMask-powered wallet, crafted by LiquidLink.
        </p>
      )}
    </>
  );
};
