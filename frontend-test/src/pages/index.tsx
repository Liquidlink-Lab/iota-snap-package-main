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
import { IOTA_DECIMALS, IOTA_CLOCK_OBJECT_ID } from '@iota/iota-sdk/utils';
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
import {
  PACKAGE_ID,
  ACTION,
  LOCK_PERIOD,
  TREASURY_CAP_OBJECT_ID,
  VAULT_OBJECT_ID,
  CERT_TYPE,
} from '@/lib/config';

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
  const [inputCoinType, setCoinType] = useState<string[]>([]);
  const [coinName, setCoinName] = useState<(string | undefined)[]>([]);
  const [coinValue, setCoinValue] = useState<(string | undefined)[]>([]);
  const [stakingAmount, setStakingAmount] = useState<string>('');
  const [nftList, setNftList] = useState<(string | undefined)[]>([]);
  const [nftRecipient, setNftRecipient] = useState<string>('');
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
    const decimals = 9;
    const s = amount.padStart(decimals + 1, '0'); // 補 0 保位數
    const intPart = s.slice(0, -decimals); // 整數部分
    let fracPart = s.slice(-decimals).replace(/0+$/, ''); // 小數部分去尾零
    return fracPart ? `${intPart}.${fracPart}` : intPart;
  }

  async function getBalance(tokenTypeInput: string) {
    console.log(currentAccount?.address);
    if (currentAccount == null) return;

    const balance = await client.getCoins({
      owner: currentAccount?.address,
      coinType: tokenTypeInput,
    });
    const val = formatUnits(balance.data[0].balance);
    console.log('balance', val);
    return val;
  }

  useEffect(() => {
    console.log('owner:', owner);

    async function getObjects() {
      if (currentAccount == null) return;

      const result = await client.getOwnedObjects({
        owner: currentAccount?.address,
        options: { showType: true, showContent: true },
      });

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

    async function getAddressNFTs() {
      if (owner == null) return;
      const nfts: any[] = [];

      const page = await client.getOwnedObjects({
        owner,
        limit: 50, // 建議給個合理上限
        options: { showType: true, showContent: true, showDisplay: true },
      });
      console.log('page', page);

      for (const obj of page.data) {
        if (!isProbablyNFT(obj)) continue;

        const fields = obj.data?.content?.fields ?? {};
        const display = obj.data?.display?.data ?? {};
        nfts.push({
          objectId: obj.data!.objectId,
          type: obj.data!.type,
          name:
            display.name || fields.name || display.title || fields.title || '',
          image:
            display.image_url ||
            display.imageUrl ||
            fields.image_url ||
            fields.imageUrl ||
            fields.url ||
            '',
          owner: obj.data!.owner,
        });
      }

      setNftList(nfts);
      console.log('nfts:', nfts);
    }

    getObjects();
    getAddressNFTs();
  }, [owner]);

  useEffect(() => {
    async function getVal() {
      console.log('inputCoinType', inputCoinType);
      if (inputCoinType == undefined) return;

      const results = await Promise.all(
        inputCoinType.map((t) => getBalance(t)),
      );
      console.log('results:', results);
      setCoinValue(results);
    }

    getVal();
  }, [inputCoinType]);

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

    registerIotaSnapWallet(wallets);
  }, []);

  const connectedToSnap =
    isConnected && currentWallet?.name === 'Iota MetaMask Snap';

  const connectedToMateWallet =
    isConnected && currentWallet?.name === 'Iota Mate Wallet';

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
    if (
      !(connectedToSnap || connectedToMateWallet || currentAccount) ||
      !currentAccount
    ) {
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
                <a
                  href={`https://explorer.iota.org/txblock/${result.digest}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'black', textDecoration: 'underline' }}
                >
                  Transaction executed successfully,
                  {`https://explorer.iota.org/txblock/${result.digest}?network=testnet`}
                </a>,
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

  const handleIotaStake = async () => {
    if (
      !stakingAmount ||
      isNaN(Number(stakingAmount)) ||
      Number(stakingAmount) <= 0
    ) {
      return;
    }
    const stakeAmountToValue = stakingAmount + '000000000';
    console.log(stakeAmountToValue);

    const tx = new Transaction();

    const [coin] = tx.splitCoins(tx.gas, [stakeAmountToValue]);

    tx.moveCall({
      target: `${PACKAGE_ID}::core::stake`,
      arguments: [
        tx.pure.string(ACTION),
        coin,
        tx.pure.u64(LOCK_PERIOD),
        tx.object(IOTA_CLOCK_OBJECT_ID),
        tx.object(TREASURY_CAP_OBJECT_ID),
        tx.object(VAULT_OBJECT_ID),
      ],
    });

    try {
      signAndExecuteTransaction(
        {
          transaction: tx as any,
          chain: 'iota:testnet',
        },
        {
          onSuccess: (result) => {
            console.log('executed transaction', result);
            toast.success(
              <a
                href={`https://explorer.iota.org/txblock/${result.digest}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'black', textDecoration: 'underline' }}
              >
                Transaction executed successfully,
                {`https://explorer.iota.org/txblock/${result.digest}?network=testnet`}
              </a>,
            );
          },

          onError: (error) => {
            console.error('error', error);
            toast.error('Transaction failed');
          },
        },
      );
    } catch (e) {
      console.log(e);
    }

    setIsTransferring(false);
  };

  function isProbablyNFT(obj: any) {
    const type = obj?.data?.type as string | undefined;
    if (!type) return false;

    // 排除可替代代幣 & Kiosk 本體
    if (type.startsWith('0x2::coin::Coin<')) return false;
    if (type === '0x2::kiosk::Kiosk') return false;

    const fields = obj?.data?.content?.fields ?? {};
    const display = obj?.data?.display?.data ?? {};

    // 有可顯示的名稱或圖片，就視為 NFT
    return Boolean(
      display.name ||
        display.image_url ||
        display.imageUrl ||
        fields.name ||
        fields.image_url ||
        fields.imageUrl ||
        fields.url ||
        fields.title,
    );
  }

  async function sendNft(nftObjectId: string) {
    if (!nftObjectId || !nftRecipient) throw new Error('missing params');

    const tx = new Transaction();
    tx.transferObjects([tx.object(nftObjectId)], nftRecipient);

    try {
      signAndExecuteTransaction(
        {
          transaction: tx as any,
          chain: 'iota:testnet',
        },
        {
          onSuccess: (result) => {
            console.log('executed transaction', result);
            toast.success(
              <a
                href={`https://explorer.iota.org/txblock/${result.digest}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'black', textDecoration: 'underline' }}
              >
                Transaction executed successfully,
                {`https://explorer.iota.org/txblock/${result.digest}?network=testnet`}
              </a>,
            );
          },

          onError: (error) => {
            console.error('error', error);
            toast.error('Transaction failed');
          },
        },
      );
    } catch (e) {
      console.log(e);
    }
  }

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

            {(connectedToSnap || connectedToMateWallet || currentAccount) &&
              currentAccount && (
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
                    <div className="flex-1">
                      <Dialog
                        onOpenChange={(open) => {
                          if (!open) {
                            setTxHash(null);
                          }
                        }}
                      >
                        <DialogTrigger className="w-full flex-1 px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-700 text-white">
                          Stake Iota
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Stake Iota</DialogTitle>
                            <DialogDescription>
                              Stake Iota and get LST Token.
                            </DialogDescription>
                            <Input
                              className="my-5"
                              type="number"
                              placeholder="Amount"
                              value={stakingAmount}
                              onChange={(e) => setStakingAmount(e.target.value)}
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
                                onClick={handleIotaStake}
                                disabled={isTransferring}
                              >
                                {isTransferring ? 'Stakeing...' : 'Stake'}
                              </Button>
                            </DialogFooter>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
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
                                onClick={handleSignAndExecuteTransaction}
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 bg-gray-300 p-4 rounded-md">
                    <h3 className="font-bold text-2xl mb-2">Other Tokens :</h3>

                    {coinItems.map((item, index) => {
                      const coinInputType =
                        inputCoinType[index] !== undefined
                          ? inputCoinType[index]
                          : 'Iota';

                      return (
                        <div>
                          <p className="text-xl" key={index}>
                            {coinName[index]}
                          </p>
                          <p className="text-sm">
                            {' '}
                            Balance: {coinValue[index]}
                          </p>

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
                                  permanently delete your account and remove
                                  your data from our servers.
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

                    {nftList.map((item: any, index) => {
                      const img = item?.image;
                      return (
                        <div>
                          <div>
                            <img
                              src={img}
                              width={50}
                              height={50}
                              alt="avatar"
                            />
                            <div>Name : {item.name}</div>
                            <div>ObjectId : {item.objectId}</div>
                          </div>

                          <Dialog
                            onOpenChange={(open) => {
                              if (!open) {
                                setTxHash(null);
                              }
                            }}
                          >
                            <DialogTrigger className="w-[160px] flex-1 px-4 py-2 rounded-md bg-blue-400 hover:bg-blue-400 text-white">
                              Send
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Transfer your NFT</DialogTitle>
                                <Input
                                  className="my-5"
                                  type="text"
                                  placeholder="Recipient"
                                  value={nftRecipient}
                                  onChange={(e) =>
                                    setNftRecipient(e.target.value)
                                  }
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
                                    onClick={() => sendNft(item.objectId)}
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
