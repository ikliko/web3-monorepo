import {combineLatest, from, map, Observable, of, switchMap} from "rxjs";
import {makeRequest} from "../core/core.service";

const cache = {
  chains: {
    data: null,
    expires: null
  }
};

export function getChains() {
  if (cache.chains.data) {
    return of(cache.chains.data);
  }

  return new Observable(subscribe => {
    fetch('https://chainid.network/chains.json')
      .then(res => res.json())
      .then(res => {
        cache.chains.data = res;
        subscribe.next(res);
        subscribe.complete();
      })
      .catch(err => {
        subscribe.error(err);
        subscribe.complete();
      });
  });
}

export function getChainById(chainId: number) {
  return getChains()
    .pipe(map((data: any) =>
      data.find((chain: any) => chain.chainId === chainId)
    ));
}

export function getCurrentChainId() {
  return makeRequest({method: 'eth_chainId'});
}

export function getCurrentChain() {
  return getCurrentChainId()
    .pipe(switchMap((chainId) => getChainById(+chainId)))
}
