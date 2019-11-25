import 'module-alias/register';

import Core from './_interface';
import { settings, ui } from './decorators';
import { onChange, onLoad } from './decorators/on';
import { adminEndpoint, publicEndpoint } from './helpers/socket';
import config from '@config';
import { filter, isNil, isString } from 'lodash';
import moment from 'moment';
import { getBroadcaster } from './commons';
import { isMainThread } from './cluster';
import oauth from './oauth';
import general from './general';
import currency from './currency';
import webhooks from './webhooks';
import glob from 'glob';

class UI extends Core {
  @settings()
  @ui({
    type: 'selector',
    values: ['light', 'dark'],
  })
  public theme: 'light' | 'dark' = 'light';

  @settings()
  public domain = 'localhost';

  @settings()
  public percentage = true;

  @settings()
  public shortennumbers = true;

  @settings()
  public stickystats = true;

  @settings()
  public showdiff = true;

  @onChange('domain')
  @onLoad('domain')
  subscribeWebhook() {
    if (isMainThread) {
      if (typeof webhooks === 'undefined') {
        setTimeout(() => this.subscribeWebhook(), 1000);
      } else {
        webhooks.subscribeAll();
      }
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'configuration', async (cb) => {
      const data: any = {};

      for (const system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch']) {
        if (typeof data.core === 'undefined') {
          data.core = {};
        }
        const self = (require('./' + system.toLowerCase())).default;
        data.core[system] = await self.getAllSettings();
      }
      for (const dir of ['systems', 'games', 'overlays', 'integrations']) {
        for (let system of glob.sync('./' + dir + '/*')) {
          if (system.startsWith('_')) {
            continue;
          }
          system = system.replace('./' + dir + '/', '').replace('.js', '');
          const self = (require('./' + dir + '/' + system.toLowerCase())).default;
          data[dir][system] = await self.getAllSettings();
        }
      }
      // currencies
      data.currency = currency.mainCurrency;
      data.currencySymbol = currency.symbol(currency.mainCurrency);

      // timezone
      data.timezone = config.timezone === 'system' || isNil(config.timezone) ? moment.tz.guess() : config.timezone;

      // lang
      data.lang = general.lang;

      data.isCastersSet = filter(oauth.generalOwners, (o) => isString(o) && o.trim().length > 0).length > 0 || getBroadcaster() !== '';

      cb(data);
    });

    publicEndpoint(this.nsp, 'configuration', async (cb) => {
      const data: any = {};

      for (const dir of ['systems', 'games']) {
        for (let system of glob.sync('./' + dir + '/*')) {
          if (system.startsWith('_')) {
            continue;
          }
          system = system.replace('./' + dir + '/', '').replace('.js', '');
          const self = (require('./' + dir + '/' + system.toLowerCase())).default;
          data[dir][system] = await self.getAllSettings();
        }
      }

      // currencies
      data.currency = currency.mainCurrency;
      data.currencySymbol = currency.symbol(currency.mainCurrency);

      // timezone
      data.timezone = config.timezone === 'system' || isNil(config.timezone) ? moment.tz.guess() : config.timezone;

      // lang
      data.lang = general.lang;

      cb(data);
    });
  }
}

export default new UI();
