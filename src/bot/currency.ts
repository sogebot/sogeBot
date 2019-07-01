// @flow

'use strict';

import axios from 'axios';
import chalk from 'chalk';
import getSymbolFromCurrency from 'currency-symbol-map';
import _ from 'lodash';
import { isMainThread } from 'worker_threads';

import Core from './_interface';
import constants from './constants';
import { settings, ui, shared } from './decorators';

class Currency extends Core {
  @settings('currency')
  @ui({
    type: 'selector',
    values: ['USD', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR'],
  })
  public mainCurrency: 'USD' | 'AUD' | 'BGN' | 'BRL' | 'CAD' | 'CHF' | 'CNY' | 'CZK' | 'DKK' | 'EUR' | 'GBP' | 'HKD' | 'HRK' | 'HUF' | 'IDR' | 'ILS' | 'INR' | 'ISK' | 'JPY' | 'KRW' | 'MXN' | 'MYR' | 'NOK' | 'NZD' | 'PHP' | 'PLN' | 'RON' | 'RUB' | 'SEK' | 'SGD' | 'THB' | 'TRY' | 'ZAR' = 'EUR';

  @shared()
  public rates: { [x: string]: number } = {};

  public timeouts: any = {};
  public base: string = 'CZK';

  constructor() {
    super();
    if (isMainThread) {
      setTimeout(() => this.updateRates(), 5 * constants.SECOND);
    }
  }

  public isCodeSupported(code: string) {
    return code === this.base || !_.isNil(this.rates[code]);
  }

  public symbol(code: string) {
    return getSymbolFromCurrency(code);
  }

  public exchange(value: number, from: string, to: string): number {
    try {
      this.rates[this.base] = 1; // base is always 1:1

      if (from.toLowerCase().trim() === to.toLowerCase().trim()) {
        return Number(value); // nothing to do
      }
      if (_.isNil(this.rates[from])) { throw Error(`${from} code was not found`); }
      if (_.isNil(this.rates[to]) && to.toLowerCase().trim() !== this.base.toLowerCase().trim()) { throw Error(`${to} code was not found`); }

      if (to.toLowerCase().trim() !== this.base.toLowerCase().trim()) {
        return (value * this.rates[from]) / this.rates[to];
      } else {
        return value * this.rates[from];
      }
    } catch (e) {
      global.log.warning(`Currency exchange error - ${e.message}`);
      global.log.warning(`Available currencies: ${Object.keys(this.rates).join(', ')}`);
      return Number(value); // don't change rate if code not found
    }
  }

  public async updateRates() {
    clearTimeout(this.timeouts.updateRates);

    let refresh = constants.DAY;
    try {
      global.log.info(chalk.yellow('CURRENCY:') + ' fetching rates');
      // base is always CZK
      const result = await axios.get('http://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt');
      let linenum = 0;
      for (let line of result.data.toString().split('\n')) {
        if (linenum < 2 || line.trim().length === 0) {
          linenum++;
          continue;
        }
        const [,, count, code, rate] = line.split('|');
        this.rates[code] = Number((rate.replace(',', '.') / count).toFixed(3));
      }
      global.log.info(chalk.yellow('CURRENCY:') + ' fetched rates');
    } catch (e) {
      global.log.error(e.stack);
      refresh = constants.SECOND;
    }

    this.timeouts.updateRates = setTimeout(() => this.updateRates(), refresh);
  }
}

export { Currency };
