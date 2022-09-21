import chalk from 'chalk';
import _ from 'lodash';
import { getRepository } from 'typeorm';

import currentRates from './helpers/currency/rates';

import Core from '~/_interface';
import { Currency as CurrencyType, UserTip } from '~/database/entity/user';
import { settings, ui } from '~/decorators';
import {
  onChange, onLoad,
} from '~/decorators/on';
import { mainCurrency } from '~/helpers/currency';
import {
  info, warning,
} from '~/helpers/log';

class Currency extends Core {
  mainCurrencyLoaded = false;

  @settings('currency')
  @ui({
    type:   'selector',
    values: Object.keys(currentRates),
  })
  public mainCurrency: CurrencyType = 'EUR';

  public timeouts: any = {};
  public base = 'USD';

  public isCodeSupported(code: CurrencyType) {
    return code === this.base || !_.isNil(currentRates[code]);
  }

  public exchange(value: number, from: CurrencyType, to: CurrencyType, rates?: { [key in CurrencyType]: number }): number {
    rates ??= _.cloneDeep(currentRates);
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
    } catch (e: any) {
      warning(`Currency exchange error - ${e.message}`);
      warning(`Available currencies: ${Object.keys(rates).join(', ')}`);
      return Number(value); // don't change rate if code not found
    }
  }

  @onLoad('mainCurrency')
  @onChange('mainCurrency')
  setMainCurrencyLoaded() {
    this.mainCurrencyLoaded = true;
    mainCurrency.value = this.mainCurrency;
  }

  @onChange('mainCurrency')
  public async recalculateSortAmount() {
    info(chalk.yellow('CURRENCY:') + ' Recalculating tips (in progress).');
    const result = await getRepository(UserTip).find();
    for (const tip of result) {
      await getRepository(UserTip).save({
        ...tip,
        sortAmount: this.exchange(tip.amount, tip.currency as CurrencyType, this.mainCurrency, tip.exchangeRates),
      });
    }
    info(chalk.yellow('CURRENCY:') + ' Recalculating tips (completed).');
  }
}

export default new Currency();
