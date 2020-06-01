'use strict';
import Core from './_interface';

import axios from 'axios';
import https from 'https';
import chalk from 'chalk';
import getSymbolFromCurrency from 'currency-symbol-map';
import _ from 'lodash';
import { isMainThread } from './cluster';

import * as constants from './constants';
import { settings, shared, ui } from './decorators';
import { error, info, warning } from './helpers/log';
import { onChange, onLoad } from './decorators/on';
import { getRepository } from 'typeorm';
import { UserTip } from './database/entity/user';


class Currency extends Core {
  mainCurrencyLoaded = false;

  @settings('currency')
  @ui({
    type: 'selector',
    values: ['USD', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR'],
  })
  public mainCurrency: currency = 'EUR';

  @shared()
  public rates: { [key in currency]: number } = {
    AUD: 0, BGN: 0, BRL: 0, CAD: 0, CHF: 0, CNY: 0, CZK: 1 /* CZK:CZK 1:1 */,
    DKK: 0, EUR: 0, GBP: 0, HKD: 0, HRK: 0, HUF: 0, IDR: 0, ILS: 0, INR: 0,
    ISK: 0, JPY: 0, KRW: 0, MXN: 0, MYR: 0, NOK: 0, NZD: 0, PHP: 0, PLN: 0,
    RON: 0, RUB: 0, SEK: 0, SGD: 0, THB: 0, TRY: 0, USD: 0, ZAR: 0,
  };

  public timeouts: any = {};
  public base = 'CZK';

  constructor() {
    super();
    if (isMainThread) {
      setTimeout(() => this.updateRates(), 5 * constants.SECOND);
    }
  }

  public isCodeSupported(code: currency) {
    return code === this.base || !_.isNil(this.rates[code]);
  }

  public symbol(code: string): currency {
    return getSymbolFromCurrency(code) as currency;
  }

  public exchange(value: number, from: currency, to: currency, rates?: { [key in currency]: number }): number {
    if (!rates) {
      rates = _.cloneDeep(this.rates);
    }
    try {
      if (from.toLowerCase().trim() === to.toLowerCase().trim()) {
        return Number(value); // nothing to do
      }
      if (_.isNil(rates[from])) {
        throw Error(`${from} code was not found`);
      }
      if (_.isNil(rates[to]) && to.toLowerCase().trim() !== this.base.toLowerCase().trim()) {
        throw Error(`${to} code was not found`);
      }

      if (to.toLowerCase().trim() !== this.base.toLowerCase().trim()) {
        return (value * rates[from]) / rates[to];
      } else {
        return value * rates[from];
      }
    } catch (e) {
      warning(`Currency exchange error - ${e.message}`);
      warning(`Available currencies: ${Object.keys(this.rates).join(', ')}`);
      return Number(value); // don't change rate if code not found
    }
  }

  @onLoad('mainCurrency')
  setMainCurrencyLoaded() {
    this.mainCurrencyLoaded = true;
  }

  @onChange('mainCurrency')
  public async recalculateSortAmount() {
    info(chalk.yellow('CURRENCY:') + ' Recalculating tips (in progress).');
    const result = await getRepository(UserTip).find();
    for (const tip of result) {
      await getRepository(UserTip).save({
        ...tip,
        sortAmount: this.exchange(tip.amount, tip.currency as currency, this.mainCurrency, tip.exchangeRates),
      });
    }
    info(chalk.yellow('CURRENCY:') + ' Recalculating tips (completed).');
  }

  public async updateRates() {
    clearTimeout(this.timeouts.updateRates);

    let refresh = constants.DAY;
    try {
      info(chalk.yellow('CURRENCY:') + ' fetching rates');
      // base is always CZK
      // using IP because dns may fail occasionally, 193.85.3.250 => cnb.cz
      const result = await axios.get('http://193.85.3.250/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt', {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });

      let linenum = 0;
      for (const line of result.data.toString().split('\n')) {
        if (linenum < 2 || line.trim().length === 0) {
          linenum++;
          continue;
        }
        const [,, count, code, rate] = line.split('|');
        this.rates[code as currency] = Number((Number(rate.replace(',', '.')) / Number(count)).toFixed(3));
      }
      info(chalk.yellow('CURRENCY:') + ' fetched rates');
    } catch (e) {
      error(e.stack);
      refresh = constants.SECOND;
    }

    this.timeouts.updateRates = setTimeout(() => this.updateRates(), refresh);
  }
}

export default new Currency();
