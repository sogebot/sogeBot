import getSymbolFromCurrency from 'currency-symbol-map';

function symbol(code: string): currency {
  return getSymbolFromCurrency(code) as currency;
}

export { symbol };