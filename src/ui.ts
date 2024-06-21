import {
  filter, isString, set,
} from 'lodash-es';

import { timezone } from './helpers/dayjsHelper.js';
import { app } from './helpers/panel.js';

import Core from '~/_interface.js';
import { onChange, onLoad } from '~/decorators/on.js';
import { settings } from '~/decorators.js';
import general from '~/botcommands.js';
import { mainCurrency, symbol } from '~/helpers/currency/index.js';
import { find, list } from '~/helpers/register.js';
import { endpoint } from '~/helpers/socket.js';
import { domain } from '~/helpers/ui/index.js';
import { variables } from '~/watchers.js';

class UI extends Core {
  @settings()
  public enablePublicPage = false;

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
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/ui/configuration', async (req, res) => {
      const data: any = {};

      for (const system of ['currency', 'ui', 'general', 'dashboard', 'tts']) {
        if (typeof data.core === 'undefined') {
          data.core = {};
        }
        const self = find('core', system);
        if (!self) {
          throw new Error(`core.${system} not found in list`);
        }
        const haveSensitiveScope = req.headers.scopes?.includes(`core:${system}:sensitive`);
        data.core[system] = await self.getAllSettings(true, haveSensitiveScope);
      }

      for (const dir of ['systems', 'games', 'overlays', 'integrations', 'services']) {
        for (const system of list(dir as any)) {
          const haveSensitiveScope = req.headers.scopes?.includes(`${dir}:${system}:sensitive`);
          set(data, `${dir}.${system.__moduleName__}`, await system.getAllSettings(true, haveSensitiveScope));
        }
      }

      // currencies
      data.currency = mainCurrency.value;
      data.currencySymbol = symbol(mainCurrency.value);

      // timezone
      data.timezone = timezone;

      // lang
      data.lang = general.lang;

      const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
      const generalOwners = variables.get('services.twitch.generalOwners') as string[];

      data.isCastersSet = filter(generalOwners, (o) => isString(o) && o.trim().length > 0).length > 0 || broadcasterUsername !== '';
      res.json(data);
    });

    endpoint([], '/core/ui', 'configuration', async (cb) => {
      try {
        const data: any = {};

        for (const system of ['tts']) {
          if (typeof data.core === 'undefined') {
            data.core = {};
          }
          const self = find('core', system);
          if (!self) {
            throw new Error(`core.${system} not found in list`);
          }
          data.core[system] = await self.getAllSettings(true);
        }

        for (const dir of ['systems', 'games']) {
          for (const system of list(dir as any)) {
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
