import { timezone } from '@sogebot/ui-helpers/dayjsHelper';
import {
  filter, isString, set,
} from 'lodash';

import Core from '~/_interface';
import { settings } from '~/decorators';
import general from '~/general';
import { mainCurrency, symbol } from '~/helpers/currency';
import { find, list } from '~/helpers/register';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import { variable } from '~/helpers/variables';

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

        for (const system of ['currency', 'ui', 'general', 'dashboard']) {
          if (typeof data.core === 'undefined') {
            data.core = {};
          }
          const self = find('core', system);
          if (!self) {
            throw new Error(`core.${system} not found in list`);
          }
          data.core[system] = await self.getAllSettings(true);
        }
        for (const dir of ['systems', 'games', 'overlays', 'integrations', 'services']) {
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

        const generalChannel = variable.get('services.twitch.generalChannel') as string;
        const broadcasterUsername = variable.get('services.twitch.broadcasterUsername') as string;
        const generalOwners = variable.get('services.twitch.generalOwners') as string[];

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
