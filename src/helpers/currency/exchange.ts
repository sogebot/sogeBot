import _ from 'lodash-es';

import currentRates from './rates.js';

import { Currency as CurrencyType } from '~/database/entity/user.js';
import { warning } from '~/helpers/log.js';

const base = 'USD';

export default function exchange(value: number, from: CurrencyType, to: CurrencyType, rates?: { [key in CurrencyType]: number }): number {
  rates ??= _.cloneDeep(currentRates);

  const valueInBaseCurrency = value / rates[from];
  try {
    if (from.toLowerCase().trim() === to.toLowerCase().trim()) {
      return Number(value); // nothing to do
    }
    if (_.isNil(rates[from])) {
      throw Error(`${from} code was not found`);
    }
    if (_.isNil(rates[to]) && to.toLowerCase().trim() !== base.toLowerCase().trim()) {
      throw Error(`${to} code was not found`);
    }

    return valueInBaseCurrency * rates[to];
  } catch (e: any) {
    warning(`Currency exchange error - ${e.message}`);
    warning(`Available currencies: ${Object.keys(rates).join(', ')}`);
    return Number(value); // don't change rate if code not found
  }
}