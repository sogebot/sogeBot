import {
  filter, isString, set,
} from 'lodash';

import { get } from './helpers/interfaceEmitter';

import Core from '~/_interface';
import { settings } from '~/decorators';
import general from '~/general';
import { mainCurrency, symbol } from '~/helpers/currency';
import { timezone } from '~/helpers/dayjs';
import { find, list } from '~/helpers/register';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';

import { onChange, onLoad } from '~/decorators/on';
import { domain } from '~/helpers/ui';

class UI extends Core {
  @settings()
  public domain = 'localhost';

  @settings()
  public percentage = true;

  @settings()
  public shortennumbers = true;

  @settings()
  public showdiff = true;

  @onChange('domain')
  @onLoad('domain')
  setDomain() {
    domain.value = this.domain;
  }

  sockets() {
    adminEndpoint(this.nsp, 'configuration', async (cb) => {
      try {
        const data: any = {};

        for (const system of ['currency', 'ui', 'general', 'twitch', 'dashboard']) {
          if (typeof data.core === 'undefined') {
            data.core = {};
          }
          const self = find('core', system);
          if (!self) {
            throw new Error(`core.${system} not found in list`);
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

        const [ broadcasterUsername, generalChannel, generalOwners ] = await Promise.all([
          get<string>('/services/twitch', 'broadcasterUsername'),
          get<string>('/services/twitch', 'generalChannel'),
          get<string>('/services/twitch', 'generalOwners'),
        ]);

        data.isCastersSet = filter(generalOwners, (o) => isString(o) && o.trim().length > 0).length > 0 || broadcasterUsername !== '';
        data.isChannelSet = filter(generalChannel, (o) => isString(o) && o.trim().length > 0).length > 0;

        cb(null, data);
      } catch (e: any) {
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

        cb(null, data);
      } catch (e: any) {
        cb(e.stack);
      }
    });
  }
}

export default new UI();
