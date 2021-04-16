import getSymbolFromCurrency from 'currency-symbol-map';

import type { currency } from '../../currency';

function symbol(code: string): currency {
  return getSymbolFromCurrency(code) as currency;
}

export { symbol };