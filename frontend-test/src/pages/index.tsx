import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Geist, Geist_Mono } from 'next/font/google';
import {
  ConnectModal,
  useCurrentAccount,
  useCurrentWallet,
  useSignPersonalMessage,
  useSignAndExecuteTransaction,
  useIotaClientQuery,
  useIotaClientContext,
} from '@iota/dapp-kit';
import {
  metaMaskAvailable,
  registerIotaSnapWallet,
} from '@liquidlink-lab/iota-snap-for-metamask';
import { Transaction } from '@iota/iota-sdk/transactions';
import { IOTA_DECIMALS } from '@iota/iota-sdk/utils';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DialogContent } from '@/components/ui/dialog';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getWallets } from '@iota/wallet-standard';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function Home() {
  const [error, setError] = useState<string | undefined>(undefined);
  const [flaskInstalled, setFlaskInstalled] = useState<boolean>(false);
  const [signatureResult, setSignatureResult] = useState<string | null>(null);
  const [qrCodeKey, setQrCodeKey] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  // Transfer
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [coinItems, setcoinItems] = useState(['$TEG', '$EEA', '$LL']);
  const popupRef = useRef<Window | null>(null);

  const { isConnected, currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  const ctx = useIotaClientContext();

  // console.log("Current Account", currentAccount);
  console.log('Context', ctx);
  const {
    data: balance,
    isPending,
    isError,
    refetch,
  } = useIotaClientQuery(
    'getBalance',
    { owner: currentAccount?.address! },
    {
      gcTime: 10000,
    },
  );

  console.log("Iota Balance: ",balance);

  // Check if MetaMask is available and register wallets
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

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'iota-mate-wallet-connected') {
        console.log('Received connection from popup:', event.data);

        setQrCodeKey(null);
        setShowQrCode(false);
        // You can handle the successful connection here
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Close popup when component unmounts
  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const wallets = getWallets();

    // registerWallet()
    // 等修改好新版就能用
    registerIotaSnapWallet(wallets);
  }, []);

  const connectedToSnap =
    isConnected && currentWallet?.name === 'Iota MetaMask Snap';

  const connectedToMateWallet =
    isConnected && currentWallet?.name === 'Iota Mate Wallet';

  // Handle QR code generation
  const handleGenerateQrCode = async () => {
    try {
      // Connect to WebSocket server
      const ws = new WebSocket('ws://localhost:3001');

      // Wait for WebSocket to open
      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      // Request connection key
      ws.send(
        JSON.stringify({
          id: 'req-' + Date.now(),
          method: 'requestConnectionKey',
          params: {},
        }),
      );

      // Wait for key response
      const response = await new Promise<any>((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          resolve(data);
        };
      });

      // Close WebSocket
      ws.close();

      if (response.error) {
        throw new Error(
          response.error.message || 'Failed to get connection key',
        );
      }

      const key = response.result;
      setQrCodeKey(key);
      setShowQrCode(true);

      // Open the connect page in a popup
      const connectUrl = `${window.location.origin}/connect?key=${key}`;
      popupRef.current = window.open(
        connectUrl,
        'IotaMateWalletConnect',
        'width=500,height=700',
      );
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError((error as Error).message);
    }
  };

  const handleConnectError = (error: any) => {
    if (error) {
      if (typeof error === 'string') {
        setError(error);
      } else {
        setError((error as Error).message);
      }
      console.error(error);
    }
  };

  const handleSignMessage = async () => {
    if (!(connectedToSnap || connectedToMateWallet) || !currentAccount) {
      return;
    }

    const messageText = connectedToMateWallet
      ? 'Hello Iota Mate Wallet!'
      : 'Hello Iota Snap!';

    signPersonalMessage(
      {
        message: new TextEncoder().encode(messageText),
        account: currentAccount,
      },
      {
        onSuccess: (result) => {
          console.log(result);
          setSignatureResult(JSON.stringify(result, null, 2));
        },
        onError: (e) => {
          if (typeof e === 'string') {
            setError(e);
          } else {
            setError((e as Error).message);
          }
          console.error(e);
        },
      },
    );
  };

  const handleSignAndExecuteTransaction = async () => {
    if (!(connectedToSnap || connectedToMateWallet) || !currentAccount) {
      throw new Error('No wallet connected');
    }

    setIsTransferring(true);

    const tx = new Transaction();
    const coin = tx.splitCoins(tx.gas, [
      tx.pure.u64(Number(amount) * 10 ** IOTA_DECIMALS),
    ]);
    tx.transferObjects([coin], recipient);

    await signAndExecuteTransaction(
      {
        transaction: tx,
        chain: 'iota:testnet',
      },
      {
        onSuccess: (result) => {
          console.log('executed transaction', result);
          setTxHash(result.digest);
          toast.success(
            `Transaction executed successfully: https://explorer.iota.org/txblock/${result.digest}?network=testnet`,
          );
        },
        onError: (error) => {
          console.error(error);
          toast.error('Transaction failed');
        },
      },
    );

    setIsTransferring(false);
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
    >
      <main className="flex flex-col gap-[32px] row-start-2 items-center w-full max-w-3xl">
        <div className="flex flex-col items-center gap-4 w-full">
          <Image
            className="dark:invert"
            src="/Iota_logo.svg"
            alt="Next.js logo"
            width={280}
            height={80}
            priority
          />

          <h1 className="text-3xl font-bold mt-8 mb-4">
            Iota Wallet Demo Example
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
            Connect to either Iota MetaMask Wallet
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 w-full">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {!flaskInstalled && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4 w-full">
              <strong className="font-bold">MetaMask Flask Required: </strong>
              <span className="block sm:inline">
                Iota Snap requires MetaMask Flask, a canary distribution for
                developers with access to upcoming features.
                <a
                  href="https://metamask.io/flask/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  Install MetaMask Flask
                </a>
              </span>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {!isConnected ? (
              <ConnectModal
                trigger={
                  <button className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed w-full">
                    Connect Wallet
                  </button>
                }
              />
            ) : (
              <></>
            )}

            {(connectedToSnap || connectedToMateWallet) && currentAccount && (
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-2 bg-gray-300 p-4 rounded-md">
                  <h3 className="font-bold mb-2">Connected Account</h3>
                  <p className="text-sm mb-2">
                    <span className="font-semibold">Wallet:</span>{' '}
                    {currentWallet?.name}
                  </p>
                  <p className="font-mono text-sm break-all">
                    {currentAccount.address}
                  </p>
                  <p>
                    Balance:{' '}
                    {balance
                      ? Number(balance.totalBalance) / 10 ** IOTA_DECIMALS : 0}{' '}
                    IOTA
                  </p>
                  <p>Network: {ctx.network}</p>
                </div>

                <div className="w-full flex gap-3">
                  <button
                    onClick={handleSignMessage}
                    className="flex-1 px-4 py-2 rounded-md bg-green-500 hover:bg-green-600 text-white"
                  >
                    Sign Message
                  </button>
                   <button
                    onClick={handleSignMessage}
                    className="flex-1 px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-700 text-white"
                  >
                    Stake Iota
                  </button>
                  <div className="flex-1">
                    <Dialog
                      onOpenChange={(open) => {
                        if (!open) {
                          setTxHash(null);
                        }
                      }}
                    >
                      <DialogTrigger className="w-full flex-1 px-4 py-2 rounded-md bg-blue-400 hover:bg-blue-400 text-white">
                        Transfer
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Transfer your token</DialogTitle>
                          <DialogDescription>
                            This action cannot be undone. This will permanently
                            delete your account and remove your data from our
                            servers.
                          </DialogDescription>
                          <Input
                            className="my-5"
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                          <Input
                            className="my-5"
                            type="text"
                            placeholder="Recipient"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                          />
                          <DialogFooter className="w-full flex justify-between">
                            <div className="flex-3">
                              {txHash && (
                                <a
                                  href={`https://explorer.iota.org/txblock/${txHash}?network=testnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-600"
                                >
                                  Tx Result
                                </a>
                              )}
                            </div>
                            <Button
                              className="flex-1"
                              onClick={handleSignAndExecuteTransaction}
                              disabled={isTransferring}
                            >
                              {isTransferring ? 'Transferring...' : 'Transfer'}
                            </Button>
                          </DialogFooter>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-gray-300 p-4 rounded-md">
                  <h3 className="font-bold text-2xl mb-2">Other Tokens :</h3>

                  {coinItems.map((item, index) => {
                    return (
                      <div>
                        <p className="text-xl" key={index}>
                          {item}
                        </p>
                        <p className="text-sm">Balance : {}</p>

                        <button
                          onClick={handleSignMessage}
                          className="flex-1 px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          Send
                        </button>
                        <br />
                      </div>
                    );
                  })}
                  <p>
                    {/*
                    {balance
                      ? Number(balance.totalBalance) / 10 ** IOTA_DECIMALS
                      : 0}{" "}
                    IOTA */}
                  </p>
                </div>

                <div className="flex flex-col gap-2 bg-gray-200 p-4 rounded-md">
                  <h3 className="font-bold text-2xl mb-2">NFT :</h3>

                  {coinItems.map((item, index) => {
                    return (
                      <div>
                        <div>
                          <Image
                            src="data:image/jpeg;base64,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"
                            width={50}
                            height={50}
                            alt={item}
                          />

                          <button
                            onClick={handleSignMessage}
                            className="mt-2 px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            Send
                          </button>
                        </div>

                        <br/>
                      </div>
                    );
                  })}
                  <p>
                    {/*
                    {balance
                      ? Number(balance.totalBalance) / 10 ** IOTA_DECIMALS
                      : 0}{" "}
                    IOTA */}
                  </p>
                </div>

                {signatureResult && (
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                    <h3 className="font-bold mb-2">Signature Result</h3>
                    <pre className="font-mono text-sm overflow-auto">
                      {signatureResult}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
