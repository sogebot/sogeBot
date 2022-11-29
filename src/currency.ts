import chalk from 'chalk';
import _ from 'lodash';
import { AppDataSource } from '~/database';

import currentRates from './helpers/currency/rates';

import Core from '~/_interface';
import { Currency as CurrencyType, UserTip } from '~/database/entity/user';
import { settings, ui } from '~/decorators';
import {
  onChange, onLoad,
} from '~/decorators/on';
import { mainCurrency } from '~/helpers/currency';
import exchange from '~/helpers/currency/exchange';
import { info } from '~/helpers/log';

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
