import type { ResponseFilter } from './index.js';

import { isStreamOnline } from '~/helpers/api/index.js';

const online: ResponseFilter = {
  '(onlineonly)': async function () {
    return isStreamOnline.value;
  },
  '(offlineonly)': async function () {
    return !(isStreamOnline.value);
  },
};

export { online };