import { isStreamOnline } from '../helpers/api';

import type { ResponseFilter } from '.';

const online: ResponseFilter = {
  '(onlineonly)': async function () {
    return isStreamOnline;
  },
  '(offlineonly)': async function () {
    return !(isStreamOnline);
  },
};

export { online };