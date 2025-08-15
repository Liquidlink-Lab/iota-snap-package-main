IOTA Snap – Frequently Asked Questions (FAQ)
1. Do I need MetaMask Flask to use IOTA Snap?

Yes. IOTA Snap is currently only supported on MetaMask Flask, the developer version of MetaMask that allows custom Snap integrations. Make sure you download MetaMask Flask before installing the Snap.

2. How do I install the IOTA Snap?

You can install it by connecting to a dApp that registers the Snap, or manually using the Snap ID and origin if testing locally. The Snap will prompt for permissions upon first installation via MetaMask Flask.

3. Can I use the IOTA Snap with regular MetaMask?

Not at the moment. MetaMask Snap support is not yet available in the production version of MetaMask. Once MetaMask officially supports Snaps in the main extension, IOTA Snap will become available for regular users.

4. Do I need to integrate anything special into my dApp to use the Snap?

Yes. Your dApp will need to interact with the Snap using JSON-RPC requests. We recommend using our official SDK (coming soon) for easier integration. Until then, developers can directly call wallet_invokeSnap via MetaMask's provider.