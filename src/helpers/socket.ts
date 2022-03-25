import { Socket } from 'socket.io';

import type { Fn, ClientToServerEventsWithNamespace, NestedFnParams } from '~/../d.ts/src/helpers/socket';

const endpoints: {
  type: 'admin' | 'viewer' | 'public';
  on: any;
  nsp: any;
  callback: any;
}[] = [];

function adminEndpoint<K0 extends keyof O, K1 extends keyof O[K0], O extends Record<PropertyKey, Record<PropertyKey, Fn>> = ClientToServerEventsWithNamespace>(nsp: K0, on: K1, callback: (...args: NestedFnParams<O, K0, K1>) => void): void {
  endpoints.push({
    nsp, on, callback, type: 'admin',
  });
}

const viewerEndpoint = (nsp: string, on: string, callback: (opts: any, cb: (error: Error | string | null, ...response: any) => void) => void, socket?: Socket) => {
  endpoints.push({
    nsp, on, callback, type: 'viewer',
  });
};

function publicEndpoint (nsp: string, on: string, callback: (opts: any, cb: (error: Error | string | null | unknown, ...response: any) => void) => void, socket?: Socket) {
  endpoints.push({
    nsp, on, callback, type: 'public',
  });
}

export {
  endpoints, adminEndpoint, viewerEndpoint, publicEndpoint,
};