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
            address: account,
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

function renderAccountInfoItem(title, value, icon) {
  return (
    <a
      rel="noreferrer"
      className="list-item-link"
    >
      {icon}
      <span>
        {title}
        <span> {value} </span>
      </span>
    </a>
  );
}

function getAssets() {
  return {
    dollar: (
      <svg xmlns="http://www.w3.org/2000/svg"
           width="24px"
           height="24px"
           viewBox="0 0 11 18"
           version="1.1">
        <g id="Icons"
           stroke="none"
           strokeWidth="1"
           fill="none"
           fillRule="evenodd">
          <g id="Rounded" transform="translate(-820.000000, -2017.000000)">
            <g id="Editor" transform="translate(100.000000, 1960.000000)">
              <g id="-Round-/-Editor-/-attach_money" transform="translate(714.000000, 54.000000)">
                <g transform="translate(0.000000, 0.000000)">
                  <polygon id="Path" points="0 0 24 0 24 24 0 24"/>
                  <path d="M11.8,10.9 C9.53,10.31 8.8,9.7 8.8,8.75 C8.8,7.66 9.81,6.9 11.5,6.9 C12.92,6.9 13.63,7.44 13.89,8.3 C14.01,8.7 14.34,9 14.76,9 L15.06,9 C15.72,9 16.19,8.35 15.96,7.73 C15.54,6.55 14.56,5.57 13,5.19 L13,4.5 C13,3.67 12.33,3 11.5,3 C10.67,3 10,3.67 10,4.5 L10,5.16 C8.06,5.58 6.5,6.84 6.5,8.77 C6.5,11.08 8.41,12.23 11.2,12.9 C13.7,13.5 14.2,14.38 14.2,15.31 C14.2,16 13.71,17.1 11.5,17.1 C9.85,17.1 9,16.51 8.67,15.67 C8.52,15.28 8.18,15 7.77,15 L7.49,15 C6.82,15 6.35,15.68 6.6,16.3 C7.17,17.69 8.5,18.51 10,18.83 L10,19.5 C10,20.33 10.67,21 11.5,21 C12.33,21 13,20.33 13,19.5 L13,18.85 C14.95,18.48 16.5,17.35 16.5,15.3 C16.5,12.46 14.07,11.49 11.8,10.9 Z" id="🔹-Icon-Color" fill="#1D1D1D"/>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    ),

    bank: (
      <svg xmlns="http://www.w3.org/2000/svg"
           width="24px"
           height="24px"
           data-name="Layer 1"
           viewBox="0 0 25 25">
        <title>Wallet</title>
        <path id="Wallet"
              d="M20,15a1,1,0,1,1-1-1A1,1,0,0,1,20,15Zm5-1.75v3.5A1.23,1.23,0,0,1,24,18v3.8A1.25,1.25,0,0,1,22.75,23H2.5A2.5,2.5,0,0,1,0,20.5V5.5A2.5,2.5,0,0,1,2.5,3H20.75A1.25,1.25,0,0,1,22,4.25V7h.75A1.25,1.25,0,0,1,24,8.25v3.8A1.23,1.23,0,0,1,25,13.25ZM1,5.5a1.46,1.46,0,0,0,.46,1.08A1.49,1.49,0,0,0,2.5,7H21V6H3V5H21V4.25A.25.25,0,0,0,20.75,4H2.5A1.5,1.5,0,0,0,1,5.5ZM23,18H19a3,3,0,1,1,0-6h4V8.25A.25.25,0,0,0,22.75,8H2.5A2.47,2.47,0,0,1,1,7.48v13A1.5,1.5,0,0,0,2.5,22H22.75a.25.25,0,0,0,.25-.25Zm1-4.75a.25.25,0,0,0-.25-.25H19a2,2,0,0,0-2,2.34A2.08,2.08,0,0,0,19.11,17h4.64a.25.25,0,0,0,.25-.25Z"
              fill="#0e1d25"/>
      </svg>
    ),

    chain: (
      <svg xmlns="http://www.w3.org/2000/svg"
           width="24px"
           height="24px"
           version="1.1"
           id="Layer_1"
           viewBox="0 0 64 64">
      <path d="M61,11h-3V8c0-1.7-1.3-3-3-3H45c-1.7,0-3,1.3-3,3v3h-2V8c0-1.7-1.3-3-3-3H27c-1.7,0-3,1.3-3,3v3h-2V8c0-1.7-1.3-3-3-3H9  C7.3,5,6,6.3,6,8v3H3c-0.6,0-1,0.4-1,1v4c0,0.6,0.4,1,1,1h3v3c0,1.7,1.3,3,3,3h10c1.7,0,3-1.3,3-3v-3h2v3c0,1.7,1.3,3,3,3h2v6h-5  c-1.7,0-3,1.3-3,3v15c0,1.7,1.3,3,3,3h16c1.7,0,3-1.3,3-3V32c0-1.7-1.3-3-3-3h-5v-6h2c1.7,0,3-1.3,3-3v-3h2v3c0,1.7,1.3,3,3,3h10  c1.7,0,3-1.3,3-3v-3h3c0.6,0,1-0.4,1-1v-4C62,11.4,61.6,11,61,11z M44,8c0-0.6,0.4-1,1-1h10c0.6,0,1,0.4,1,1v3h-2v-1  c0-0.6-0.4-1-1-1h-6c-0.6,0-1,0.4-1,1v1h-2V8z M52,17h-4c0.6,0,1-0.4,1-1v-4c0-0.6-0.4-1-1-1h4c-0.6,0-1,0.4-1,1v4  C51,16.6,51.4,17,52,17z M39,15h-4v-2h4h4h4v2h-4H39z M21,15h-4v-2h4h4h4v2h-4H21z M12,11h4c-0.6,0-1,0.4-1,1v4c0,0.6,0.4,1,1,1h-4  c0.6,0,1-0.4,1-1v-4C13,11.4,12.6,11,12,11z M30,11h4c-0.6,0-1,0.4-1,1v4c0,0.6,0.4,1,1,1h-4c0.6,0,1-0.4,1-1v-4  C31,11.4,30.6,11,30,11z M26,8c0-0.6,0.4-1,1-1h10c0.6,0,1,0.4,1,1v3h-2v-1c0-0.6-0.4-1-1-1h-6c-0.6,0-1,0.4-1,1v1h-2V8z M8,8  c0-0.6,0.4-1,1-1h10c0.6,0,1,0.4,1,1v3h-2v-1c0-0.6-0.4-1-1-1h-6c-0.6,0-1,0.4-1,1v1H8V8z M4,13h3h4v2H7H4V13z M20,20  c0,0.6-0.4,1-1,1H9c-0.6,0-1-0.4-1-1v-3h2v1c0,0.6,0.4,1,1,1h6c0.6,0,1-0.4,1-1v-1h2V20z M41,32v15c0,0.6-0.4,1-1,1H24  c-0.6,0-1-0.4-1-1V32c0-0.6,0.4-1,1-1h16C40.6,31,41,31.4,41,32z M33,29h-2v-6h2V29z M38,20c0,0.6-0.4,1-1,1H27c-0.6,0-1-0.4-1-1v-3  h2v1c0,0.6,0.4,1,1,1h6c0.6,0,1-0.4,1-1v-1h2V20z M56,20c0,0.6-0.4,1-1,1H45c-0.6,0-1-0.4-1-1v-3h2v1c0,0.6,0.4,1,1,1h6  c0.6,0,1-0.4,1-1v-1h2V20z M60,15h-3h-4v-2h4h3V15z"/>
      <path d="M29,45c0,0.6,0.4,1,1,1h4c0.6,0,1-0.4,1-1v-5.4c0.6-0.7,1-1.7,1-2.6c0-2.2-1.8-4-4-4s-4,1.8-4,4c0,1,0.4,1.9,1,2.6V45z   M32,35c1.1,0,2,0.9,2,2c0,0.6-0.2,1.1-0.7,1.5c-0.2,0.2-0.3,0.5-0.3,0.7V44h-2v-4.8c0-0.3-0.1-0.6-0.3-0.7C30.2,38.1,30,37.6,30,37  C30,35.9,30.9,35,32,35z"/>
      <path d="M20.9,56.8c0.6,0.4,1.2,0.7,1.9,1l0.9-1.8c-0.6-0.3-1.1-0.6-1.7-0.9L20.9,56.8z"/>
      <path d="M16.4,49.8l-1.6,1.1c0.4,0.6,0.8,1.2,1.3,1.7l1.5-1.3C17.1,50.8,16.7,50.3,16.4,49.8z"/>
      <path d="M14.5,46.4l-1.8,0.8c0.3,0.7,0.6,1.3,0.9,1.9l1.8-1C15,47.6,14.7,47,14.5,46.4z"/>
      <path d="M24.7,58.7c0.7,0.2,1.4,0.5,2,0.6l0.5-1.9c-0.6-0.2-1.2-0.4-1.8-0.6L24.7,58.7z"/>
      <path d="M46.5,51.3l1.5,1.3c0.5-0.5,0.9-1.1,1.3-1.7l-1.6-1.1C47.3,50.3,46.9,50.8,46.5,51.3z"/>
      <path d="M17.5,54.2c0.5,0.5,1.1,1,1.6,1.4l1.2-1.6c-0.5-0.4-1-0.8-1.5-1.3L17.5,54.2z"/>
      <path d="M40.4,56l0.9,1.8c0.6-0.3,1.3-0.7,1.9-1l-1.1-1.7C41.6,55.4,41,55.7,40.4,56z"/>
      <path d="M36.8,57.4l0.5,1.9c0.7-0.2,1.4-0.4,2-0.6l-0.7-1.9C38.1,57,37.4,57.2,36.8,57.4z"/>
      <path d="M51,38.8l0,0.2c0,0.6,0,1.2-0.1,1.7l2,0.2C53,40.3,53,39.6,53,39l0-0.2L51,38.8z"/>
      <path d="M52.9,36.6c-0.1-0.7-0.2-1.4-0.3-2.1l-2,0.4c0.1,0.6,0.2,1.3,0.3,1.9L52.9,36.6z"/>
      <path d="M50.2,44.5l1.9,0.6c0.2-0.7,0.4-1.4,0.5-2.1l-2-0.4C50.5,43.3,50.4,43.9,50.2,44.5z"/>
      <path d="M48.7,48.1l1.8,1c0.3-0.6,0.7-1.3,0.9-1.9l-1.8-0.8C49.3,46.9,49,47.5,48.7,48.1z"/>
      <path d="M28.8,59.8c0.7,0.1,1.4,0.2,2.1,0.2l0.1-2c-0.6,0-1.3-0.1-1.9-0.2L28.8,59.8z"/>
      <path d="M33,58l0.1,2c0.7,0,1.4-0.1,2.1-0.2l-0.3-2C34.3,57.9,33.6,57.9,33,58z"/>
      <path d="M47.4,27.9c0.4,0.5,0.7,1.1,1.1,1.6l1.7-1c-0.4-0.6-0.7-1.2-1.2-1.8L47.4,27.9z"/>
      <path d="M13,39l0-0.2l-2,0l0,0.2c0,0.7,0,1.3,0.1,2l2-0.2C13,40.2,13,39.6,13,39z"/>
      <path d="M49.4,31.3c0.3,0.6,0.5,1.2,0.7,1.8l1.9-0.6c-0.2-0.7-0.5-1.3-0.8-2L49.4,31.3z"/>
      <path d="M12,32.5l1.9,0.6c0.2-0.6,0.4-1.2,0.7-1.8l-1.8-0.8C12.5,31.1,12.2,31.8,12,32.5z"/>
      <path d="M16.5,28l-1.6-1.2c-0.4,0.6-0.8,1.2-1.2,1.8l1.7,1C15.8,29,16.2,28.5,16.5,28z"/>
      <path d="M13.4,42.7l-2,0.4c0.1,0.7,0.3,1.4,0.5,2.1l1.9-0.6C13.6,44,13.5,43.3,13.4,42.7z"/>
      <path d="M43.7,54l1.2,1.6c0.6-0.4,1.1-0.9,1.6-1.4l-1.4-1.4C44.7,53.1,44.2,53.6,43.7,54z"/>
      <path d="M11.1,36.7l2,0.2c0.1-0.6,0.2-1.3,0.3-1.9l-2-0.4C11.3,35.3,11.2,36,11.1,36.7z"/>
      </svg>
    )
  }
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

  const { dollar, chain, bank } = getAssets();

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
          {renderAccountInfoItem('Address', account.address, bank)}
          {renderAccountInfoItem('Balance', `${account.balance} ${currentChain?.nativeCurrency?.symbol}`, dollar)}
          {renderAccountInfoItem('Chain', `${currentChain?.name}`, chain)}
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
