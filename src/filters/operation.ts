import events from '../events';
import { info } from '../helpers/log';

import type { ResponseFilter } from '.';

import alerts from '~/registries/alerts';

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
    const countRegex = new RegExp('\\$triggerAlert\\((?<id>\\S*)\\)', 'gm');
    const match = countRegex.exec(filter);
    if (match && match.groups) {
      info(`Triggering alert ${match.groups.id} by command ${attributes.command}`);

      await alerts.trigger({
        amount:     0,
        currency:   'CZK',
        event:      'cmdredeems',
        alertId:    match.groups.id,
        message:    '',
        monthsName: '',
        name:       attributes.command,
        tier:       null,
        recipient:  attributes.sender.userName,
      });
    }
    return '';
  },
};