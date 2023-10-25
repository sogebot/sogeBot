import { EventList } from '@entity/eventList.js';

import type { ResponseFilter } from './index.js';

import { AppDataSource } from '~/database.js';
import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import getNameById from '~/helpers/user/getNameById.js';

async function toptipFilter(type: 'overall' | 'stream', value: 'username' | 'amount' | 'message' | 'currency'): Promise<string> {
  let tips = (await AppDataSource.getRepository(EventList).createQueryBuilder('events')
    .select('events')
    .orderBy('events.timestamp', 'DESC')
    .where('events.event >= :event', { event: 'tip' })
    .andWhere('NOT events.isTest')
    .andWhere('NOT events.isHidden')
    .getMany())
    .sort((a, b) => {
      const aValue = JSON.parse(a.values_json);
      const bValue = JSON.parse(b.values_json);
      const aTip = exchange(aValue.amount, aValue.currency, mainCurrency.value);
      const bTip = exchange(bValue.amount, bValue.currency, mainCurrency.value);
      return bTip - aTip;
    });

  if (type === 'stream') {
    const whenOnline = isStreamOnline.value ? streamStatusChangeSince.value : null;
    if (whenOnline) {
      tips = tips.filter((o) => o.timestamp >= (new Date(whenOnline)).getTime());
    } else {
      return '';
    }
  }

  if (tips.length > 0) {
    let username = '';
    try {
    // first we check if user is even actual user
      username = await getNameById(tips[0].userId);
    } catch (e) {
    // hide tip from unknown user
      tips[0].isHidden = true;
      await AppDataSource.getRepository(EventList).save(tips[0]);
      // re-do again
      return toptipFilter(type, value);
    }

    switch (value) {
      case 'amount':
        return Number(JSON.parse(tips[0].values_json).amount).toFixed(2);
      case 'currency':
        return JSON.parse(tips[0].values_json).currency;
      case 'message':
        return JSON.parse(tips[0].values_json).message;
      case 'username':
        return username;
    }
  }
  return '';
}

const info: ResponseFilter = {
  '$toptip.overall.amount':   async () => await toptipFilter('overall', 'amount'),
  '$toptip.overall.currency': async () => await toptipFilter('overall', 'currency'),
  '$toptip.overall.message':  async () => await toptipFilter('overall', 'message'),
  '$toptip.overall.username': async () => await toptipFilter('overall', 'username'),
  '$toptip.stream.amount':    async () => await toptipFilter('stream', 'amount'),
  '$toptip.stream.currency':  async () => await toptipFilter('stream', 'currency'),
  '$toptip.stream.message':   async () => await toptipFilter('stream', 'message'),
  '$toptip.stream.username':  async () => await toptipFilter('stream', 'username'),
  '(game)':                   async function () {
    return stats.value.currentGame || 'n/a';
  },
  '(status)': async function () {
    return stats.value.currentTitle || 'n/a';
  },
};

export { info };