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

  // Transfer
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  type CoinItem = {
    coinType: string;
    balance: string;
  };

  const [coinItems, setCoinItems] = useState<CoinItem[]>([]);
  const [inputCoinType, setCoinType] = useState<(string)[]>([]);
  const [coinName, setCoinName] = useState<(string | undefined)[]>([]);
  const [coinValue, setCoinValue] = useState<(string | undefined)[]>([]);
  const popupRef = useRef<Window | null>(null);

  const { isConnected, currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  const ctx = useIotaClientContext();
  const owner = currentAccount?.address;


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

  function formatUnits(amount: string) {
    const decimals = 9
    const s = amount.padStart(decimals + 1, '0'); // 補 0 保位數
    const intPart = s.slice(0, -decimals);        // 整數部分
    let fracPart = s.slice(-decimals).replace(/0+$/, ''); // 小數部分去尾零
    return fracPart ? `${intPart}.${fracPart}` : intPart;
  }

  async function getBalance(tokenTypeInput:string) {
    console.log(currentAccount?.address)
    if(currentAccount == null)return

    const balance = await client.getCoins({
      owner:
        currentAccount?.address,
      coinType:
        tokenTypeInput,
    });
    const val = formatUnits(balance.data[0].balance)
    console.log('balance',val)
    return val
  };

  async function getObjects() {
    const result = await client.getOwnedObjects({
      owner:
        '0x65be91d6e3178f1cf305fb83a42792f507dbd28465f5aec3ca5381d6d735d99b',
      options: { showType: true, showContent: true },
    });

    //console.log('result:',result)

    // 過濾出 Coin<T> 類型並轉成我們要的格式
    const coins: CoinItem[] = result.data
      .map((obj) => {
        const type = obj.data?.type ?? '';
        if (!type.startsWith('0x2::coin::Coin<')) return null;

        const m = type.match(/^0x2::coin::Coin<(.+)>$/);
        const coinType = m?.[1];
        const balanceRaw = (obj.data as any)?.content?.fields?.balance;

        if (!coinType || balanceRaw == null) return null; // 直接丟掉不完整資料
        return { coinType };
      })
      .filter((x): x is CoinItem => x !== null); // 型別守衛，縮窄為 CoinItem

    console.log('coin:', coins);
    setCoinType(coins.map((c) => c.coinType)); // coinType 清單



    const metas = await Promise.all(
      coins.map(async ({ coinType }) => {
        const meta = await client.getCoinMetadata({ coinType });
        return meta?.symbol;
      }),
    );

    setCoinName(metas);
    console.log('metas', metas);

    setCoinItems(coins);
  }

  useEffect(()=>{

    async function getVal() {
      console.log('inputCoinType',inputCoinType)
      if(inputCoinType == undefined)return

      const results = await Promise.all(inputCoinType.map(t => getBalance(t)));
      console.log('results:',results)
      setCoinValue(results);
    }

    getVal()

  },[owner])

  useEffect(() => {
    getObjects();
  }, []);

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
    console.log('wallets', wallets);
    // registerWallet()
    // 等修改好新版就能用
    registerIotaSnapWallet(wallets);
  }, []);

  const connectedToSnap =
    isConnected && currentWallet?.name === 'Iota MetaMask Snap';

  const connectedToMateWallet =
    isConnected && currentWallet?.name === 'Iota Mate Wallet';

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

  const testSignAndSednTransaction = async (tokenType: string) => {
    if (!(connectedToSnap || connectedToMateWallet) || !currentAccount) {
      throw new Error('No wallet connected');
    }
    setIsTransferring(true);

    try {
      const tx = new Transaction();

      // 若是用「Gas coin」本身（例如你要用 IOTA/SUI 本體當 gas 幣來轉）
      // 就可以仍然使用 tx.gas 拆分：
      const isGasLike = tokenType === '0x2::iota::IOTA';

      if (isGasLike) {
        // 直接從 gas coin 拆一顆出來轉
        const piece = tx.splitCoins(tx.gas, [
          tx.pure.u64(Number(amount) * 10 ** IOTA_DECIMALS),
        ]);
        tx.transferObjects([piece], recipient);
      } else {
        // 1) 先找你擁有的 Coin<tokenType>
        //const { currentAccount } = useWallet();
        //const addresses = await client.getAddresses();
        const owner = currentAccount?.address;
        const coins = await client.getCoins({ owner, coinType: tokenType });
        console.log('address coins: ', coins);
        if (!coins.data.length) {
          throw new Error(`No ${tokenType} coin objects in wallet`);
        }

        // 2) 選第一顆當主 coin，其他先 merge 進來
        const primary = tx.object(coins.data[0].coinObjectId);
        const others = coins.data
          .slice(1)
          .map((c) => tx.object(c.coinObjectId));
        if (others.length) {
          tx.mergeCoins(primary, others);
        }

        // 3) 從主 coin split 出所需數量
        const piece = tx.splitCoins(primary, [
          tx.pure.u64(Number(amount) * 10 ** IOTA_DECIMALS),
        ]);

        // 4) 轉給對方
        tx.transferObjects([piece], recipient);
      }

      try {
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
                `Transaction executed: https://explorer.iota.org/txblock/${result.digest}?network=testnet`,
              );
            },
            onError: (error) => {
              console.error(error);
              toast.error('Transaction failed');
            },
          },
        );
      } finally {
        setIsTransferring(false);
      }
    } catch (e) {
      console.error(e);
    }
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
                      ? Number(balance.totalBalance) / 10 ** IOTA_DECIMALS
                      : 0}{' '}
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
                    const coinInputType =
                      inputCoinType[index] !== undefined ? inputCoinType[index] : 'Iota';

                    return (
                      <div>
                        <p className="text-xl" key={index}>
                          {coinName[index]}
                        </p>
                        <p className="text-sm"> Balance: {coinValue[index]}</p>


                        <Dialog
                          onOpenChange={(open) => {
                            if (!open) {
                              setTxHash(null);
                            }
                          }}
                        >
                          <DialogTrigger className="w-[160px] flex-1 px-4 py-2 rounded-md bg-blue-400 hover:bg-blue-400 text-white">
                            Transfer
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Transfer your token</DialogTitle>
                              <DialogDescription>
                                This action cannot be undone. This will
                                permanently delete your account and remove your
                                data from our servers.
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
                                  onClick={() =>
                                    testSignAndSednTransaction(coinInputType)
                                  }
                                  disabled={isTransferring}
                                >
                                  {isTransferring
                                    ? 'Transferring...'
                                    : 'Transfer'}
                                </Button>
                              </DialogFooter>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
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
                            alt=""
                          />

                          <button
                            onClick={handleSignMessage}
                            className="mt-2 px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            Send
                          </button>
                        </div>

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
