import {RequestParams} from "./core.interface";
import {from, Observable, of} from 'rxjs';

const provider: any = initProvider();
const service: any = provider?.request;

function initProvider() {
  if (typeof window === 'undefined') {
    return;
  }

  const {ethereum} = <any>window;

  if (!ethereum) {
    return;
  }

  return ethereum;
}

function _makeRequestEffect(requestParams: RequestParams): Observable<any> {
  if (!service) {
    return of(null)
  }

  return new Observable((subscribe) => {
    service(requestParams)
      .then((data: any) => {
        subscribe.next(data);
        subscribe.complete();
      })
      .catch((error: any) => {
        subscribe.error(error);
        subscribe.complete();
      })
  });
}

export function makeRequest(requestParams: RequestParams, req = _makeRequestEffect): Observable<any> {
  return req(requestParams)
}

export function ableToMakeRequest(): Observable<any> {
  return of({
    metamask: provider
  });
}
