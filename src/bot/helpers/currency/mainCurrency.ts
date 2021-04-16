import type { currency } from '../../currency';

let _mainCurrency: currency = 'EUR';

const mainCurrency = {
  set value(value: currency) {
    _mainCurrency = value;
  },
  get value() {
    return _mainCurrency;
  },
};

export { mainCurrency };