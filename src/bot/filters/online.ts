import api from '../api';

import { ResponseFilter } from '.';

const online: ResponseFilter = {
  '(onlineonly)': async function () {
    return api.isStreamOnline;
  },
  '(offlineonly)': async function () {
    return !(api.isStreamOnline);
  },
};

export { online };