import type { ResponseFilter } from '.';

import { isStreamOnline } from '~/helpers/api';

const online: ResponseFilter = {
  '(onlineonly)': async function () {
    return isStreamOnline.value;
  },
  '(offlineonly)': async function () {
    return !(isStreamOnline.value);
  },
};

export { online };