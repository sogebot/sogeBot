import {
  filter, isString, set,
} from 'lodash';

import Core from './_interface';
import { settings, ui } from './decorators';
import general from './general';
import { mainCurrency, symbol } from './helpers/currency';
import { timezone } from './helpers/dayjs';
import { getBroadcaster } from './helpers/getBroadcaster';
import { generalChannel } from './helpers/oauth/generalChannel';
import { generalOwners } from './helpers/oauth/generalOwners';
import { find, list } from './helpers/register';
import { adminEndpoint, publicEndpoint } from './helpers/socket';
import { default as uiModule } from './ui';

class UI extends Core {
  @settings()
  @ui({
    type:   'selector',
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

  sockets() {
    adminEndpoint(this.nsp, 'configuration', async (cb) => {
      try {
        const data: any = {};

        for (const system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch']) {
          if (typeof data.core === 'undefined') {
            data.core = {};
          }
          const self = find('core', system);
          if (!self) {
            throw new Error(`core.${name} not found in list`);
          }
          data.core[system] = await self.getAllSettings(true);
        }
        for (const dir of ['systems', 'games', 'overlays', 'integrations']) {
          for (const system of list(dir)) {
            set(data, `${dir}.${system.__moduleName__}`, await system.getAllSettings(true));
          }
        }
        // currencies
        data.currency = mainCurrency.value;
        data.currencySymbol = symbol(mainCurrency.value);

        // timezone
        data.timezone = timezone;

        // lang
        data.lang = general.lang;

        data.isCastersSet = filter(generalOwners.value, (o) => isString(o) && o.trim().length > 0).length > 0 || getBroadcaster() !== '';
        data.isChannelSet = filter(generalChannel.value, (o) => isString(o) && o.trim().length > 0).length > 0;

        cb(null, data);
      } catch (e) {
        cb(e.stack);
      }
    });

    publicEndpoint(this.nsp, 'configuration', async (cb) => {
      try {
        const data: any = {};

        for (const dir of ['systems', 'games']) {
          for (const system of list(dir)) {
            set(data, `${dir}.${system.__moduleName__}`, await system.getAllSettings(true));
          }
        }

        // currencies
        data.currency = mainCurrency.value;
        data.currencySymbol = symbol(mainCurrency.value);

        // timezone
        data.timezone = timezone;

        // lang
        data.lang = general.lang;

        // theme
        set(data, 'core.ui.theme', uiModule.theme);

        cb(null, data);
      } catch (e) {
        cb(e.stack);
      }
    });
  }
}

export default new UI();
