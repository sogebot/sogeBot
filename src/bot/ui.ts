import Core from './_interface';
import { settings, ui } from './decorators';
import { onChange, onLoad } from './decorators/on';
import { adminEndpoint, publicEndpoint } from './helpers/socket';
import config from '@config';
import { filter, isNil, isString } from 'lodash';
import moment from 'moment';
import { getBroadcaster } from './commons';
import { isMainThread } from 'worker_threads';

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
      if (typeof global.webhooks === 'undefined') {
        setTimeout(() => this.subscribeWebhook(), 1000)
      } else {
        global.webhooks.subscribeAll();
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
        data.core[system] = await global[system].getAllSettings();
      }

      for (const system of Object.keys(global.systems).filter(o => !o.startsWith('_'))) {
        if (typeof data.systems === 'undefined') {
          data.systems = {};
        }
        data.systems[system] = await global.systems[system].getAllSettings();
      }

      for (const system of Object.keys(global.integrations).filter(o => !o.startsWith('_'))) {
        if (typeof data.integrations === 'undefined') {
          data.integrations = {};
        }
        data.integrations[system] = await global.integrations[system].getAllSettings();
      }

      for (const system of Object.keys(global.games).filter(o => !o.startsWith('_'))) {
        if (typeof data.games === 'undefined') {
          data.games = {};
        }
        data.games[system] = await global.games[system].getAllSettings();
      }

      // currencies
      data.currency = global.currency.mainCurrency;
      data.currencySymbol = global.currency.symbol(global.currency.mainCurrency);

      // timezone
      data.timezone = config.timezone === 'system' || isNil(config.timezone) ? moment.tz.guess() : config.timezone;

      // lang
      data.lang = global.general.lang;

      data.isCastersSet = filter(global.oauth.generalOwners, (o) => isString(o) && o.trim().length > 0).length > 0 || getBroadcaster() !== '';

      cb(data);
    });

    publicEndpoint(this.nsp, 'configuration', async (cb) => {
      const data: any = {};

      for (const system of Object.keys(global.systems).filter(o => !o.startsWith('_'))) {
        if (typeof data.systems === 'undefined') {
          data.systems = {};
        }
        data.systems[system] = await global.systems[system].getAllSettings();
      }

      for (const system of Object.keys(global.games).filter(o => !o.startsWith('_'))) {
        if (typeof data.games === 'undefined') {
          data.games = {};
        }
        data.games[system] = await global.games[system].getAllSettings();
      }

      // currencies
      data.currency = global.currency.mainCurrency;
      data.currencySymbol = global.currency.symbol(global.currency.mainCurrency);

      // timezone
      data.timezone = config.timezone === 'system' || isNil(config.timezone) ? moment.tz.guess() : config.timezone;

      // lang
      data.lang = global.general.lang;

      cb(data);
    });
  }
}

export default UI;
export { UI };
