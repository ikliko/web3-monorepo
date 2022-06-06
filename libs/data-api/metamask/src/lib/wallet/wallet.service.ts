import {ableToMakeRequest, makeRequest} from "../core/core.service";
import {Observable, map} from "rxjs";

export function connectWallet() {
  makeRequest({
    method: 'eth_requestAccounts'
  })
}

export function getWalletBalance(address: string, options: string[] = ['latest']) {
  return makeRequest({
    method: 'eth_getBalance',
    params: [
      address,
      ...options
    ]
  }).pipe(map(data => 123));
}

export function getWalletAddresses(): Observable<any> {
  return makeRequest({
    method: 'eth_accounts'
  })
}

export function getWalletAvailableProviders() {
  return ableToMakeRequest();
}
