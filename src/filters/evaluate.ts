import { runScript } from '../helpers/customvariables/runScript.js';

import type { ResponseFilter } from './index.js';

const evaluate: ResponseFilter = {
  '(eval#)': async function (filter, attr) {
    const toEvaluate = filter.replace('(eval ', '').slice(0, -1);

    return await runScript(toEvaluate, { sender: attr.sender.userName, isUI: false, _current: undefined });
  },
};

export { evaluate };