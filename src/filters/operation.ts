import events from '../events.js';
import { info } from '../helpers/log.js';

import type { ResponseFilter } from './index.js';

import { AppDataSource } from '~/database.js';
import { EmitData } from '~/database/entity/alert.js';
import { Price } from '~/database/entity/price.js';
import alerts from '~/registries/alerts.js';

const selectedItemRegex = /\$triggerAlert\((?<uuid>[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}),? ?(?<options>.*)?\)/mi;
// expecting 21 symbols for nanoid
const selectedItemRegexNanoId = /\$triggerAlert\((?<uuid>.{21}),? ?(?<options>.*)?\)/mi;

export const operation: ResponseFilter = {
  '$triggerOperation(#)': async function (filter: string, attributes) {
    const countRegex = new RegExp('\\$triggerOperation\\((?<id>\\S*)\\)', 'gm');
    const match = countRegex.exec(filter);
    if (match && match.groups) {
      info(`Triggering event ${match.groups.id} by command ${attributes.command}`);
      await events.fire(match.groups.id, { userId: attributes.sender.userId, username: attributes.sender.userName, isTriggeredByCommand: attributes.command });
    }
    return '';
  },
  '$triggerAlert(#)': async function (filter: string, attributes) {
    // TODO: selectedItemRegex is deprecated
    for (const regex of [selectedItemRegex, selectedItemRegexNanoId]) {
      const match = regex.exec(filter);
      if (match && match.groups) {
        let customOptions: EmitData['customOptions'] = {};
        if (match.groups.options) {
          customOptions = JSON.parse(Buffer.from(match.groups.options, 'base64').toString('utf-8'));
          info(`Triggering alert ${match.groups.uuid} by command ${attributes.command} with custom options ${JSON.stringify(customOptions)}`);
        } else {
          info(`Triggering alert ${match.groups.uuid} by command ${attributes.command}`);
        }

        const price = await AppDataSource.getRepository(Price).findOneBy({ command: attributes.command, enabled: true });

        await alerts.trigger({
          amount:     price ? price.price : 0,
          currency:   'CZK',
          event:      'custom',
          alertId:    match.groups.uuid,
          message:    attributes.param || '',
          monthsName: '',
          name:       attributes.command,
          tier:       null,
          recipient:  attributes.sender.userName,
          customOptions,
        });
      }
    }
    return '';
  },
};