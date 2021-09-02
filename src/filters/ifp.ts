import { isNil } from 'lodash';
import safeEval from 'safe-eval';

import type { ResponseFilter } from '.';

const ifp: ResponseFilter = {
  '(if#)': async function (filter: string, attr) {
    // (if $days>2|More than 2 days|Less than 2 days)
    try {
      const toEvaluate = filter
        .replace('(if ', '')
        .slice(0, -1)
        .replace(/\$param|\$!param/g, attr.param ?? ''); // replace params
      let [check, ifTrue, ifFalse] = toEvaluate.split('|');
      check = check.startsWith('>') || check.startsWith('<') || check.startsWith('=') ? 'false' : check; // force check to false if starts with comparation
      if (isNil(ifTrue)) {
        return;
      }
      if (safeEval(check)) {
        return ifTrue;
      }
      return isNil(ifFalse) ? '' : ifFalse;
    } catch (e: any) {
      return '';
    }
  },
};

export{ ifp };