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
import { getFullnodeUrl, IotaClient } from '@iota/iota-sdk/client';


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const client = new IotaClient({
  url: getFullnodeUrl('testnet'), // 可改成 'mainnet' 或 'testnet'
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
  //console.log('Context', ctx);
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


  const tokenValue =  async function getBalance(){
    const balance = await client.getCoins({
        owner: '0x8094009873f3766303184ab8663d82157300c5007e85708573762813e4a9c66b',
        coinType: '0x2cf341d32644d538f5bd4a654e95bba35df7f9013f29830b73e6a0f6d988f9af::cert::CERT'

      });
    console.log("Iota Balance: ",balance);
  }

  async function getObjects(){
    const result = await client.getOwnedObjects({
      owner: '0x8094009873f3766303184ab8663d82157300c5007e85708573762813e4a9c66b',
      options: {
          showType: true,
      }
    });
    //const metadata = await client.getCoinMetadata({ coinType });

    if (result.data) {
      for (const index of result.data) {
        if (index.data && typeof index.data.type === 'string') {
          console.log(index.data.type);
          const metadata = await client.getCoinMetadata({ coinType: '0x2cf341d32644d538f5bd4a654e95bba35df7f9013f29830b73e6a0f6d988f9af::cert::CERT' });
          console.log(metadata)
        }
      }
    }
    //console.log('object : ',result)
  } 

  tokenValue()
  getObjects()

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
        transaction: tx as any,
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
