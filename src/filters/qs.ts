import querystring from 'querystring';

import type { ResponseFilter } from './index.js';

const qs: ResponseFilter = {
  '$querystring': async function (_variable, attr) {
    if (typeof attr.param !== 'undefined' && attr.param.length !== 0) {
      return querystring.escape(attr.param);
    }
    return '';
  },
  '(url|#)': async function (_variable, attr) {
    try {
      if (!attr.param) {
        throw new Error('Missing param.');
      }
      return encodeURI(attr.param);
    } catch (e: any) {
      return '';
    }
  },
};

export { qs };