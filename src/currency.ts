import chalk from 'chalk';
import _ from 'lodash-es';

import currentRates from './helpers/currency/rates.js';

import Core from '~/_interface.js';
import { Currency as CurrencyType, UserTip } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import {
  onChange, onLoad,
} from '~/decorators/on.js';
import { settings, ui } from '~/decorators.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import { info } from '~/helpers/log.js';

class Currency extends Core {
  mainCurrencyLoaded = false;

  @settings('currency')
  @ui({
    type:   'selector',
    values: Object.keys(currentRates),
  })
  public mainCurrency: CurrencyType = 'EUR';

  public timeouts: any = {};

  public isCodeSupported(code: CurrencyType) {
    return code === 'USD' || !_.isNil(currentRates[code]);
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
    const result = await AppDataSource.getRepository(UserTip).find();
    for (const tip of result) {
      await AppDataSource.getRepository(UserTip).save({
        ...tip,
        sortAmount: exchange(tip.amount, tip.currency as CurrencyType, this.mainCurrency, tip.exchangeRates),
      });
    }
    info(chalk.yellow('CURRENCY:') + ' Recalculating tips (completed).');
  }
}

export default new Currency();
