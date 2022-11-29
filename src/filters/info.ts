import { EventList } from '@entity/eventList';
import { AppDataSource } from '~/database';

import users from '../users';

import type { ResponseFilter } from '.';

import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api';
import { mainCurrency } from '~/helpers/currency';
import exchange from '~/helpers/currency/exchange';

const info: ResponseFilter = {
  '$toptip.#.#': async function (filter: string) {
    const match = filter.match(/\$toptip\.(?<type>overall|stream)\.(?<value>username|amount|message|currency)/);
    if (!match) {
      return '';
    }

    let tips = (await AppDataSource.getRepository(EventList).createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event >= :event', { event: 'tip' })
      .andWhere('NOT events.isTest')
      .getMany())
      .sort((a, b) => {
        const aValue = JSON.parse(a.values_json);
        const bValue = JSON.parse(b.values_json);
        const aTip = exchange(aValue.amount, aValue.currency, mainCurrency.value);
        const bTip = exchange(bValue.amount, bValue.currency, mainCurrency.value);
        return bTip - aTip;
      });

    const type = match.groups?.type;
    if (type === 'stream') {
      const whenOnline = isStreamOnline.value ? streamStatusChangeSince.value : null;
      if (whenOnline) {
        tips = tips.filter((o) => o.timestamp >= (new Date(whenOnline)).getTime());
      } else {
        return '';
      }
    }

    if (tips.length > 0) {
      const value = match.groups?.value;
      switch(value) {
        case 'amount':
          return Number(JSON.parse(tips[0].values_json).amount).toFixed(2);
        case 'currency':
          return Number(JSON.parse(tips[0].values_json).currency);
        case 'message':
          return Number(JSON.parse(tips[0].values_json).message);
        case 'username':
          return users.getNameById(tips[0].userId);
      }
    }
    return '';
  },
  '(game)': async function () {
    return stats.value.currentGame || 'n/a';
  },
  '(status)': async function () {
    return stats.value.currentTitle || 'n/a';
  },
};

export { info };