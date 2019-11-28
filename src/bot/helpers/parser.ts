import * as constants from '../constants';
import { warning } from './log';

export let linesParsed = 0;
export const linesParsedIncrement = () => {
  linesParsed++;
};

export const _avgResponse: number[] = [];
export const avgResponse = (opts: { value: number; message: string }) => {
  let avgTime = 0;
  _avgResponse.push(opts.value);
  if (opts.value > 5000) {
    warning(`Took ${opts.value}ms to process: ${opts.message}`);
  }
  if (_avgResponse.length > 100) {
    _avgResponse.shift();
  }
  for (const time of _avgResponse) {
    avgTime += time;
  }
  status.RES = Number((avgTime / _avgResponse.length).toFixed(0));
};

export const status = {
  TMI: constants.DISCONNECTED,
  API: constants.DISCONNECTED,
  MOD: false,
  RES: 0,
};
export const setStatus = (key: string, value: any) => {
  status[key] = value;
};