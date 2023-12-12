import { DISCONNECTED } from './constants.js';

export let linesParsed = 0;
export const linesParsedIncrement = () => {
  linesParsed++;
};

export const status = {
  TMI: DISCONNECTED,
  API: DISCONNECTED,
  MOD: false,
};

export function setStatus(key: 'TMI' | 'API', value: 0 | 1 | 2 | 3): void;
export function setStatus(key: 'MOD', value: boolean): void;
export function setStatus(key: 'RES', value: number): void;
export function setStatus(key: any, value: any): void {
  (status as any)[key] = value;
}
