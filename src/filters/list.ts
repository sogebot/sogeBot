import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import { format } from '@sogebot/ui-helpers/number';
import _ from 'lodash';
import { getRepository } from 'typeorm';

import { Alias } from '../database/entity/alias';
import { Commands } from '../database/entity/commands';
import { Cooldown } from '../database/entity/cooldown';
import { Price } from '../database/entity/price';
import { Rank } from '../database/entity/rank';
import general from '../general.js';
import { enabled } from '../helpers/interface/enabled';
import { error, warning } from '../helpers/log';
import { get, getCommandPermission } from '../helpers/permissions';
import { getPointsName } from '../helpers/points';
import Parser from '../parser';
import { translate } from '../translate';

import type { ResponseFilter } from '.';

const list: ResponseFilter = {
  '(list.#)': async function (filter: string) {
    const [main, permission] = filter.replace('(list.', '').replace(')', '').split('.');
    let system = main;
    let group: null | string | undefined = undefined;
    if (main.includes('|')) {
      [system, group] = main.split('|');
      if (group.trim().length === 0) {
        group = null;
      }
    }
    let [alias, commands, cooldowns, ranks, prices] = await Promise.all([
      getRepository(Alias).find({
        where: typeof group !== 'undefined' ? {
          visible: true, enabled: true, group,
        } : { visible: true, enabled: true },
      }),
      getRepository(Commands).find({ relations: ['responses'], where: { visible: true, enabled: true } }),
      getRepository(Cooldown).find({ where: { isEnabled: true } }),
      getRepository(Rank).find(),
      getRepository(Price).find({ where: { enabled: true } }),
    ]);

    let listOutput: any = [];
    switch (system) {
      case 'alias':
        return alias.length === 0 ? ' ' : (alias.map((o: { alias: string; }) => {
          const findPrice = prices.find((p: { command: any; }) => p.command === o.alias);
          if (findPrice && enabled.status('/systems/price')) {
            if (findPrice.price > 0 && findPrice.priceBits === 0) {
              return o.alias.replace('!', '') + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)})`;
            } else if (findPrice.priceBits > 0 && findPrice.price === 0) {
              return o.alias.replace('!', '') + `(${format(general.numberFormat, 0)(findPrice.priceBits)} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            } else {
              return o.alias.replace('!', '') + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)} or ${findPrice.priceBits} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            }
          }
          return o.alias.replace('!', '');
        })).sort().join(', ');
      case '!alias':
        return alias.length === 0 ? ' ' : (alias.map((o: { alias: string; }) => {
          const findPrice = prices.find((p: { command: any; }) => p.command === o.alias);
          if (findPrice && enabled.status('/systems/price')) {
            if (findPrice.price > 0 && findPrice.priceBits === 0) {
              return o.alias + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)})`;
            } else if (findPrice.priceBits > 0 && findPrice.price === 0) {
              return o.alias + `(${format(general.numberFormat, 0)(findPrice.priceBits)} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            } else {
              return o.alias + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)} or ${findPrice.priceBits} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            }
          }
          return o.alias;
        })).sort().join(', ');
      case 'core':
      case '!core':
        if (permission) {
          const _permission = await get(permission);
          if (_permission) {
            const coreCommands = (await Promise.all((await new Parser().getCommandsList()).map(async (item) => {
              const customPermission = await getCommandPermission(item.id);
              return { ...item, permission: typeof customPermission !== 'undefined' ? customPermission : item.permission };
            })))
              .filter(item => item.permission === _permission.id);
            return coreCommands.length === 0
              ? ' '
              : coreCommands.map(item => system === '!core' ? item.command : item.command.replace('!', '')).sort().join(', ');
          } else {
            error(`Permission for (list.core.${permission}) not found.`);
            return '';
          }
        } else {
          error('Missing permission for (list.core.<missing>).');
          return '';
        }
      case 'command':
        if (permission) {
          const responses = commands.map((o: { responses: any; }) => o.responses).flat();
          const _permission = await get(permission);
          if (_permission) {
            const commandIds = responses.filter((o: { permission: string | undefined; }) => o.permission === _permission.id).map((o: { id: any; }) => o.id);
            commands = commands.filter((o: { id: any; }) => commandIds.includes(o.id));
          } else {
            commands = [];
          }
        }
        return commands.length === 0 ? ' ' : (commands.map((o: { command: string; }) => {
          const findPrice = prices.find((p: { command: any; }) => p.command === o.command);
          if (findPrice && enabled.status('/systems/price')) {
            if (findPrice.price > 0 && findPrice.priceBits === 0) {
              return o.command.replace('!', '') + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)})`;
            } else if (findPrice.priceBits > 0 && findPrice.price === 0) {
              return o.command.replace('!', '') + `(${findPrice.priceBits} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            } else {
              return o.command.replace('!', '') + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)} or ${findPrice.priceBits} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            }
          }
          return o.command.replace('!', '');
        })).sort().join(', ');
      case '!command':
        if (permission) {
          const responses = commands.map((o: { responses: any; }) => o.responses).flat();
          const _permission = await get(permission);
          if (_permission) {
            const commandIds = responses.filter((o: { permission: string | undefined; }) => o.permission === _permission.id).map((o: { id: any; }) => o.id);
            commands = commands.filter((o: { id: any; }) => commandIds.includes(o.id));
          } else {
            commands = [];
          }
        }
        return commands.length === 0 ? ' ' : (commands.map((o: { command: string; }) => {
          const findPrice = prices.find((p: { command: any; }) => p.command === o.command);
          if (findPrice && enabled.status('/systems/price')) {
            if (findPrice.price > 0 && findPrice.priceBits === 0) {
              return o.command + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)})`;
            } else if (findPrice.priceBits > 0 && findPrice.price === 0) {
              return o.command + `(${findPrice.priceBits} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            } else {
              return o.command + `(${format(general.numberFormat, 0)(findPrice.price)} ${getPointsName(findPrice.price)} or ${findPrice.priceBits} ${getLocalizedName(findPrice.priceBits, translate('core.bits'))})`;
            }
          }
          return o.command;
        })).sort().join(', ');
      case 'cooldown':
        listOutput = cooldowns.map((o: { miliseconds: any; name: string; }) => {
          const time = o.miliseconds;
          return o.name + ': ' + (time / 1000) + 's';
        }).sort().join(', ');
        return listOutput.length > 0 ? listOutput : ' ';
      case 'price':
        listOutput = prices.map((o: { command: any; price: any; }) => {
          return `${o.command} (${o.price}${getPointsName(o.price)})`;
        }).join(', ');
        return listOutput.length > 0 ? listOutput : ' ';
      case 'ranks':
        listOutput = _.orderBy(ranks.filter((o: { type: string; }) => o.type === 'viewer'), 'value', 'asc').map((o) => {
          return `${o.rank} (${o.value}h)`;
        }).join(', ');
        return listOutput.length > 0 ? listOutput : ' ';
      case 'ranks.follow':
        listOutput = _.orderBy(ranks.filter((o: { type: string; }) => o.type === 'follower'), 'value', 'asc').map((o) => {
          return `${o.rank} (${o.value} ${getLocalizedName(o.value, translate('core.months'))})`;
        }).join(', ');
        return listOutput.length > 0 ? listOutput : ' ';
      case 'ranks.sub':
        listOutput = _.orderBy(ranks.filter((o: { type: string; }) => o.type === 'subscriber'), 'value', 'asc').map((o) => {
          return `${o.rank} (${o.value} ${getLocalizedName(o.value, translate('core.months'))})`;
        }).join(', ');
        return listOutput.length > 0 ? listOutput : ' ';
      default:
        warning('unknown list system ' + system);
        return '';
    }
  },
};

export { list };