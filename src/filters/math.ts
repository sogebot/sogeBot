import { evaluate as mathJsEvaluate } from 'mathjs';

import type { ResponseFilter } from './index.js';

import { getValueOf } from '~/helpers/customvariables/index.js';

const math: ResponseFilter = {
  '(math.#)': async function (filter: any) {
    let toEvaluate = filter.replace(/\(math./g, '').replace(/\)/g, '');

    // check if custom variables are here
    const regexp = /(\$_\w+)/g;
    const match = toEvaluate.match(regexp);
    if (match) {
      for (const variable of match) {
        const currentValue = await getValueOf(variable);
        toEvaluate = toEvaluate.replace(
          variable,
          isNaN(Number(currentValue)) ? 0 : currentValue,
        );
      }
    }
    return mathJsEvaluate(toEvaluate);
  },
  '(toPercent|#)': async function (filter: any) {
    const _toEvaluate = filter.replace(/\(toPercent\|/g, '').replace(/\)/g, '');
    let [toFixed, toEvaluate] = _toEvaluate.split('|');
    if (!toEvaluate) {
      toEvaluate = toFixed;
      toFixed = 0;
    }
    toEvaluate = toEvaluate.replace(`${toFixed}|`, '');

    // check if custom variables are here
    const regexp = /(\$_\w+)/g;
    const match = toEvaluate.match(regexp);
    if (match) {
      for (const variable of match) {
        const currentValue = await getValueOf(variable);
        toEvaluate = toEvaluate.replace(
          variable,
          isNaN(Number(currentValue)) ? 0 : currentValue,
        );
      }
    }
    return Number(100*toEvaluate).toFixed(toFixed);
  },
  '(toFloat|#)': async function (filter: any) {
    const _toEvaluate = filter.replace(/\(toFloat\|/g, '').replace(/\)/g, '');
    let [toFixed, toEvaluate] = _toEvaluate.split('|');
    if (!toEvaluate) {
      toEvaluate = toFixed;
      toFixed = 0;
    }
    toEvaluate = toEvaluate.replace(`${toFixed}|`, '');

    // check if custom variables are here
    const regexp = /(\$_\w+)/g;
    const match = toEvaluate.match(regexp);
    if (match) {
      for (const variable of match) {
        const currentValue = await getValueOf(variable);
        toEvaluate = toEvaluate.replace(
          variable,
          isNaN(Number(currentValue)) ? 0 : currentValue,
        );
      }
    }
    return Number(toEvaluate).toFixed(toFixed);
  },
};

export { math };