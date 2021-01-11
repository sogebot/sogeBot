import { isStreamOnline } from '../helpers/api';

import type { ResponseFilter } from '.';

const online: ResponseFilter = {
  '(onlineonly)': async function () {
    return isStreamOnline.value;
  },
  '(offlineonly)': async function () {
    return !(isStreamOnline.value);
  },
};

export { online };