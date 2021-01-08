import { getRepository } from 'typeorm';

import api from '../api';
import currency from '../currency';
import { EventList } from '../database/entity/eventList';
import users from '../users';

import type { ResponseFilter } from '.';

const info: ResponseFilter = {
  '$toptip.#.#': async function (filter: string) {
    const match = filter.match(/\$toptip\.(?<type>overall|stream)\.(?<value>username|amount|message|currency)/);
    if (!match) {
      return '';
    }

    let tips = (await getRepository(EventList).createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event >= :event', { event: 'tip' })
      .andWhere('NOT events.isTest')
      .getMany())
      .sort((a, b) => {
        const aValue = JSON.parse(a.values_json);
        const bValue = JSON.parse(b.values_json);
        const aTip = currency.exchange(aValue.amount, aValue.currency, currency.mainCurrency);
        const bTip = currency.exchange(bValue.amount, bValue.currency, currency.mainCurrency);
        return bTip - aTip;
      });

    const type = match.groups?.type;
    if (type === 'stream') {
      const whenOnline = api.isStreamOnline ? api.streamStatusChangeSince : null;
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
    return api.stats.currentGame || 'n/a';
  },
  '(status)': async function () {
    return api.stats.currentTitle || 'n/a';
  },
};

export { info };