import { runScript } from '../helpers/customvariables/runScript';

import type { ResponseFilter } from '.';

const evaluate: ResponseFilter = {
  '(eval#)': async function (filter, attr) {
    const toEvaluate = filter.replace('(eval ', '').slice(0, -1);

    return await runScript(toEvaluate, { sender: attr.sender.userName, isUI: false, _current: undefined });
  },
};

export { evaluate };