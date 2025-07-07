# IOTA Snap for MetaMask

IOTA Snap is an extension for MetaMask that enables users to seamlessly manage their IOTA assets directly within the MetaMask wallet interface. By leveraging BIP39-compatible key management, this Snap allows MetaMask to sign transactions and securely handle IOTA addresses without requiring a separate IOTA-native wallet.

---

## Guide

- npm install iota-snap-for-metamask
- npm install @iota/wallet-standard
- import { registerIotaSnapWallet } from "iota-snap-for-metamask";
  import { getWallets } from "@iota/wallet-standard";
  registerIotaSnapWallet(getWallets())

- index.ts
  import { metaMaskAvailable } from "iota-snap-for-metamask";
    const [flaskInstalled, setFlaskInstalled] = useState<boolean>(false);

    useEffect(() => {
    const checkMetaMaskAndRegisterWallets = async () => {
      try {
        const metaMaskState = await metaMaskAvailable();
        setFlaskInstalled(metaMaskState.available);
        // Register Iota Mate Wallet
      } catch (e) {
        setFlaskInstalled(false);
        console.error(e);
      }
    };

    checkMetaMaskAndRegisterWallets();
  }, []);



## Features

- **IOTA Wallet Integration**
  Use MetaMask to generate and manage IOTA addresses, send and receive tokens, and sign transactions on the IOTA network.

- **DeFi Compatibility**
  Interact with IOTA on-chain DeFi protocols, including staking, liquidity provision, and other smart contract features built on IOTA Move.

- **Developer SDK**
  A dedicated Node.js SDK is provided to help projects integrate IOTA Snap functionality directly into their front-end dApps, enabling easy onboarding for MetaMask users.

- **Secure and Open-Source**
  Fully open-sourced under the Apache-2.0 license, ensuring transparency and security.

---

## Quick Start

1. Install MetaMask Flask (developer build)
2. Install the IOTA Snap
3. Connect to supported IOTA networks (e.g., testnet or mainnet)
4. Start managing IOTA assets seamlessly with your existing MetaMask account

---

## Links

- [SDK NPM package](https://www.npmjs.com/package/iota-snap-for-metamask)
- [GitHub repository](https://github.com/Liquidlink-Lab/iota-snap-package-main/tree/main)

