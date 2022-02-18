import getSymbolFromCurrency from 'currency-symbol-map';

import { Currency } from '~/database/entity/user';

function symbol(code: string): Currency {
  return getSymbolFromCurrency(code) as Currency;
}

export { symbol };