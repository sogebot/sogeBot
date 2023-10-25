import twitch from '../services/twitch.js';

import type { ResponseFilter } from './index.js';

const param: ResponseFilter = {
  '$touser': async function (_variable, attr) {
    if (typeof attr.param !== 'undefined') {
      attr.param = attr.param.replace('@', '');
      if (attr.param.length > 0) {
        if (twitch.showWithAt) {
          attr.param = '@' + attr.param;
        }
        return attr.param;
      }
    }
    return (twitch.showWithAt ? '@' : '') + attr.sender.userName;
  },
  '$param': async function (_variable, attr) {
    if (typeof attr.param !== 'undefined' && attr.param.length !== 0) {
      return attr.param;
    }
    return '';
  },
  '$!param': async function (_variable, attr) {
    if (typeof attr.param !== 'undefined' && attr.param.length !== 0) {
      return attr.param;
    }
    return 'n/a';
  },
};

export { param };