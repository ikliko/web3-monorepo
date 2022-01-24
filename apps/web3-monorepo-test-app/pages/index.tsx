import styles from './index.module.scss';
import {useEffect, useState} from "react";
import {switchMap} from "rxjs/operators";
import {combineLatest, EMPTY, from, map, Observable, of} from "rxjs";

interface MetamaskData {
  isLoading: boolean;
  isInstalled: boolean;
  isAuthenticated: boolean;
  provider: null;
}

interface AccountData {
  address: string;
  balance: number;
}

interface Explorer {
  name: string;
  standard: string;
  url: string;
}

interface NativeChainCurrency {
  name: string;
  symbol: string;
  decimals: string;
}

interface Chain {
  chain: string;
  chainId: number;
  ens: { registry: string };
  explorers: Explorer[];
  faucets: any[];
  icon: string;
  infoUrl: string;
  name: string;
  nativeCurrency: NativeChainCurrency;
  networkId: number;
  rpc: string[];
  shortName: string;
  slip44: number;
}

interface ChainsData {
  chains: Chain[];
  currentChain: Chain;
}

function getChains(): Observable<Chain[]> {
  return from<Chain[]>(fetch('https://chainid.network/chains.json')
    .then(res => res.json()));
}

function getAccounts(): Observable<string> {
  if (!window) {
    return of<string>('');
  }

  const {ethereum} = window;

  if (!ethereum) {
    return of<string>('');
  }

  return from<string>(ethereum.request({
    method: 'eth_accounts'
  }));
}

function getAccountBalance(account): Observable<number | any> {
  if (!window) {
    // type unknown
    return of<any>(null);
  }

  const {ethereum} = window;

  return from<number | any>(ethereum.request({
    method: 'eth_getBalance',
    params: [
      account,
      'latest'
    ]
  })).pipe(map(balance => {
    return parseBalance(balance);
  }));
}

function getCurrentChainId(): Observable<any> {
  if (!window) {
    return of(null);
  }

  const {ethereum} = window;

  if (!ethereum) {
    return of(null);
  }

  return from(ethereum.request({method: 'eth_chainId'}));
}

function useChainState() {
  const [chainsData, setChainsData] = useState<ChainsData>({
    chains: null,
    currentChain: null
  });

  useEffect(() => {


    combineLatest([
      getCurrentChainId(),
      getChains()
    ])
      .subscribe(data => {
        const chainId: number = data[0];
        const chains: Chain[] = data[1];
        const currentChain: Chain = chains.find((chain: Chain) => chain.chainId === +chainId);

        setChainsData({
          ...chainsData,
          chains,
          currentChain,
        })
      })
  }, []);

  return chainsData;
};

function useAccountState() {
  const [accountData, setAccountData] = useState<AccountData>({
    address: null,
    balance: 0
  });

  useEffect(() => {
    const {ethereum} = window;

    getAccounts()
      .pipe(
        switchMap((accounts) => {
          if (!accounts.length) {
            return EMPTY
          }

          return combineLatest([
            of(accounts),
            getAccountBalance(accounts[0]),
          ])
        })
      )
      .subscribe(data => {
        const addresses = data[0];
        const balance = data[1];
        const address = addresses[0];

        setAccountData({
          ...accountData,
          balance,
          address
        })
      });

    if (!ethereum) {
      return;
    }

    ethereum.on('accountsChanged', accounts => {
      const account = accounts[0];

      if (!account) {
        return;
      }

      ethereum.request({
        method: 'eth_getBalance',
        params: [
          accounts[0],
          'latest'
        ]
      })
        .catch(e => console.log(e))
        .then(data => {
          setAccountData({
            ...accountData,
            balance: parseBalance(data),
          })
        })
    });
  }, []);

  return accountData;
}

function parseBalance(amount, decimals = 18) {
  return amount / Math.pow(10, decimals);
}

function useMetamaskState() {
  const [metamaskData, setMetamaskData] = useState<MetamaskData>({
    isLoading: true,
    isInstalled: false,
    isAuthenticated: false,
    provider: null
  });

  useEffect(() => {
    const {ethereum} = window;

    if (!ethereum) {
      return;
    }

    ethereum.on('accountsChanged', accounts => {
      setMetamaskData({
        ...metamaskData,
        isInstalled: !!ethereum,
        isAuthenticated: !!accounts.length,
        provider: ethereum
      })
    });

    ethereum
      .request({method: 'eth_accounts'})
      .then(accounts => {
        setMetamaskData({
          ...metamaskData,
          isLoading: false,
          isInstalled: !!ethereum,
          isAuthenticated: !!accounts.length,
          provider: ethereum
        })
      })
      .catch((err) => {
        // Some unexpected error.
        // For backwards compatibility reasons, if no accounts are available,
        // eth_accounts will return an empty array.
        console.warn(err);
      });
  }, []);

  return metamaskData;
}

function renderNoMetamask() {
  return (
    <div>
      <div id="hero" className="rounded">
        <div className="text-container">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="red"
                 strokeWidth="2"
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 className="feather feather-x-circle">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>MetaMask is not installed</span>
          </h2>
          <a href="https://metamask.io/"
             target="_blank"> Download MetaMask </a>
        </div>
        <div className="logo-container">
          <svg
            fill="currentColor"
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.987 14.138l-3.132 4.923-5.193-8.427-.012 8.822H0V4.544h3.691l5.247 8.833.005-3.998 3.044 4.759zm.601-5.761c.024-.048 0-3.784.008-3.833h-3.65c.002.059-.005 3.776-.003 3.833h3.645zm5.634 4.134a2.061 2.061 0 0 0-1.969 1.336 1.963 1.963 0 0 1 2.343-.739c.396.161.917.422 1.33.283a2.1 2.1 0 0 0-1.704-.88zm3.39 1.061c-.375-.13-.8-.277-1.109-.681-.06-.08-.116-.17-.176-.265a2.143 2.143 0 0 0-.533-.642c-.294-.216-.68-.322-1.18-.322a2.482 2.482 0 0 0-2.294 1.536 2.325 2.325 0 0 1 4.002.388.75.75 0 0 0 .836.334c.493-.105.46.36 1.203.518v-.133c-.003-.446-.246-.55-.75-.733zm2.024 1.266a.723.723 0 0 0 .347-.638c-.01-2.957-2.41-5.487-5.37-5.487a5.364 5.364 0 0 0-4.487 2.418c-.01-.026-1.522-2.39-1.538-2.418H8.943l3.463 5.423-3.379 5.32h3.54l1.54-2.366 1.568 2.366h3.541l-3.21-5.052a.7.7 0 0 1-.084-.32 2.69 2.69 0 0 1 2.69-2.691h.001c1.488 0 1.736.89 2.057 1.308.634.826 1.9.464 1.9 1.541a.707.707 0 0 0 1.066.596zm.35.133c-.173.372-.56.338-.755.639-.176.271.114.412.114.412s.337.156.538-.311c.104-.231.14-.488.103-.74z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function renderLoginScreen() {
  const connectWallet = () => {
    window.ethereum.request({method: 'eth_requestAccounts'})
      .catch(e => console.log(e))
      .then(data => {
      });
  };

  return (
    <div>
      <div id="hero" className="rounded">
        <div className="text-container">
          <h2>
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            <span>MetaMask is detected</span>
          </h2>
          <a style={{
            cursor: 'pointer'
          }}
             onClick={connectWallet}>
            Authenticate
          </a>
        </div>
        <div className="logo-container">
          <svg
            fill="currentColor"
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.987 14.138l-3.132 4.923-5.193-8.427-.012 8.822H0V4.544h3.691l5.247 8.833.005-3.998 3.044 4.759zm.601-5.761c.024-.048 0-3.784.008-3.833h-3.65c.002.059-.005 3.776-.003 3.833h3.645zm5.634 4.134a2.061 2.061 0 0 0-1.969 1.336 1.963 1.963 0 0 1 2.343-.739c.396.161.917.422 1.33.283a2.1 2.1 0 0 0-1.704-.88zm3.39 1.061c-.375-.13-.8-.277-1.109-.681-.06-.08-.116-.17-.176-.265a2.143 2.143 0 0 0-.533-.642c-.294-.216-.68-.322-1.18-.322a2.482 2.482 0 0 0-2.294 1.536 2.325 2.325 0 0 1 4.002.388.75.75 0 0 0 .836.334c.493-.105.46.36 1.203.518v-.133c-.003-.446-.246-.55-.75-.733zm2.024 1.266a.723.723 0 0 0 .347-.638c-.01-2.957-2.41-5.487-5.37-5.487a5.364 5.364 0 0 0-4.487 2.418c-.01-.026-1.522-2.39-1.538-2.418H8.943l3.463 5.423-3.379 5.32h3.54l1.54-2.366 1.568 2.366h3.541l-3.21-5.052a.7.7 0 0 1-.084-.32 2.69 2.69 0 0 1 2.69-2.691h.001c1.488 0 1.736.89 2.057 1.308.634.826 1.9.464 1.9 1.541a.707.707 0 0 0 1.066.596zm.35.133c-.173.372-.56.338-.755.639-.176.271.114.412.114.412s.337.156.538-.311c.104-.231.14-.488.103-.74z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function renderAccountInfoItem(title, value) {
  return (
    <a
      rel="noreferrer"
      className="list-item-link"
    >
      <svg xmlns="http://www.w3.org/2000/svg"
           fill="currentColor"
           role="img"
           viewBox="0 0 100 100"
           version="1.1">
        <desc>Created with Sketch.</desc>
        <defs/>
        <g id="19.-Bank"
           stroke="none"
           strokeWidth="1"
           fill="none"
           fillRule="evenodd"
           strokeLinecap="round"
           strokeLinejoin="round">
          <path
            d="M50.0000002,2 C50.0000002,2 1.42779378,27.7656332 2.00510582,27.7945661 L2.00510582,34.64 L97.9948945,34.64 L97.9948945,27.7944731 C98.5721884,27.7655989 50.0000002,2 50.0000002,2 L50.0000002,2 L50.0000002,2 Z"
            id="Layer-1"
            stroke="#222F3E"
            strokeWidth="4"/>
          <polygon id="Layer-2"
                   stroke="#222F3E"
                   strokeWidth="4"
                   points="30 44 30 80.6294886 12.72 80.6294886 12.72 44 10 44 10 35 32.16 35 32.16 44"/>
          <polygon id="Layer-3"
                   stroke="#222F3E"
                   strokeWidth="4"
                   points="59 44 59 80.6294886 41.72 80.6294886 41.72 44 39 44 39 35 61.16 35 61.16 44"/>
          <polygon id="Layer-4"
                   stroke="#222F3E"
                   strokeWidth="4"
                   points="88 44 88 80.6294886 70.72 80.6294886 70.72 44 68 44 68 35 90.16 35 90.16 44"/>
          <polygon id="Layer-5"
                   stroke="#222F3E"
                   strokeWidth="4"
                   points="89.744 88.5432836 89.744 80.72 10.256 80.72 10.256 88.5432836 6.8 88.5432836 6.8 98 93.2 98 93.2 88.5432836"/>
        </g>
      </svg>
      <span>
        {title}
        <span> {value} </span>
      </span>
    </a>
  );
}

function renderWalletPage() {
  const metamaskData = useMetamaskState();
  const account = useAccountState();
  const chainsData = useChainState();

  if (!metamaskData.isInstalled) {
    return renderNoMetamask();
  }

  if (!metamaskData.isAuthenticated) {
    return renderLoginScreen();
  }

  const {currentChain} = chainsData;

  return (
    <div>
      <div id="hero" className="rounded">
        <div className="text-container">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg"
                 fill="currentColor"
                 role="img"
                 version="1.1" id="Layer_1" x="0px" y="0px"
                 viewBox="0 0 50 50">
              <path
                d="M46.5,14.2c-0.3-0.4-0.7-0.7-1-1c-2.6-2.6-2.6-2.6-0.1-5.2c0.7-0.7,0.7-1.1,0-1.7c-1.1-1-2.2-2-3.1-3.1  c-0.8-1-1.3-0.9-2.2,0c-6.7,6.8-13.5,13.5-20.2,20.3c-0.9,0.9-1.6,1.2-3,0.8C9.2,21.9,1.4,28,1.6,35.9C1.8,43,8.1,48.5,15,47.5  c8.1-1.2,12.6-9.3,9.3-16.8c-0.3-0.8-0.5-1.2,0.2-1.9c2.5-2.4,5-4.9,7.4-7.4c0.6-0.6,0.9-0.5,1.4,0c1.4,1.5,2.9,3,4.4,4.4  c0.4,0.4,0.6,0.8,1.3,0.3c3-2.3,3.1-2.6,0.5-5.2c-0.4-0.4-0.8-0.8-1.2-1.2c-2.5-2.5-2.5-2.5,0.1-5c0.7-0.7,1.1-0.6,1.7,0  c1.4,1.5,2.8,2.9,4.3,4.3c0.3,0.3,0.6,1,1.2,0.3c0.9-1,2.2-1.8,2.7-2.9C48.7,15.8,47.1,15,46.5,14.2z M13.5,40.4  c-2.5,0-4.7-2.2-4.7-4.6c0-2.5,2.2-4.8,4.7-4.9c2.5,0,4.8,2.2,4.8,4.8C18.3,38.3,16.1,40.4,13.5,40.4z"/>
            </svg>
            <span>You&apos;re connected</span>
          </h2>
          <a href="https://metamask.zendesk.com/hc/en-us/articles/360059535551-Disconnect-wallet-from-Dapp"
             target="_blank"> How to disconnect </a>
        </div>
        <div className="logo-container">
          <svg
            fill="currentColor"
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.987 14.138l-3.132 4.923-5.193-8.427-.012 8.822H0V4.544h3.691l5.247 8.833.005-3.998 3.044 4.759zm.601-5.761c.024-.048 0-3.784.008-3.833h-3.65c.002.059-.005 3.776-.003 3.833h3.645zm5.634 4.134a2.061 2.061 0 0 0-1.969 1.336 1.963 1.963 0 0 1 2.343-.739c.396.161.917.422 1.33.283a2.1 2.1 0 0 0-1.704-.88zm3.39 1.061c-.375-.13-.8-.277-1.109-.681-.06-.08-.116-.17-.176-.265a2.143 2.143 0 0 0-.533-.642c-.294-.216-.68-.322-1.18-.322a2.482 2.482 0 0 0-2.294 1.536 2.325 2.325 0 0 1 4.002.388.75.75 0 0 0 .836.334c.493-.105.46.36 1.203.518v-.133c-.003-.446-.246-.55-.75-.733zm2.024 1.266a.723.723 0 0 0 .347-.638c-.01-2.957-2.41-5.487-5.37-5.487a5.364 5.364 0 0 0-4.487 2.418c-.01-.026-1.522-2.39-1.538-2.418H8.943l3.463 5.423-3.379 5.32h3.54l1.54-2.366 1.568 2.366h3.541l-3.21-5.052a.7.7 0 0 1-.084-.32 2.69 2.69 0 0 1 2.69-2.691h.001c1.488 0 1.736.89 2.057 1.308.634.826 1.9.464 1.9 1.541a.707.707 0 0 0 1.066.596zm.35.133c-.173.372-.56.338-.755.639-.176.271.114.412.114.412s.337.156.538-.311c.104-.231.14-.488.103-.74z"/>
          </svg>
        </div>
      </div>

      <div id="middle-content">
        <div id="learning-materials" className="rounded shadow">
          <h2>Account Info</h2>
          {renderAccountInfoItem('Address', account.address)}
          {renderAccountInfoItem('Balance', `${account.balance} ${currentChain?.nativeCurrency?.symbol}`)}
          {renderAccountInfoItem('Chain', `${currentChain?.name}`)}
        </div>
        <div id="other-links">
          <div id="nx-cloud" className="rounded shadow">
            <div>
              <h2>More options</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Index() {
  return (
    <div className={styles.page}>
      <div className="wrapper">
        <div className="container">
          <div id="welcome">
            <h1>
              Welcome to the Wallet Reader App
            </h1>
          </div>

          {renderWalletPage()}

          <p id="love">
            Carefully crafted with
            <svg
              fill="currentColor"
              stroke="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Index;
