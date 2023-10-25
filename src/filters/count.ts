import { EventList } from '@entity/eventList.js';
import { UserBit, UserTip } from '@entity/user.js';
import { DAY, HOUR } from '@sogebot/ui-helpers/constants.js';
import { AppDataSource } from '~/database.js';
import { In, MoreThanOrEqual } from 'typeorm';

import type { ResponseFilter } from './index.js';

const time: Record<string, number> = {
  'hour':  HOUR,
  'day':   DAY,
  'week':  7 * DAY,
  'month': 31 * DAY,
  'year':  365 * DAY,
};

const count: ResponseFilter = {
  '(count|subs|#)': async function (filter) {
    const timestamp: number = time[filter.replace('(count|subs|', '').slice(0, -1).toLowerCase()] ?? DAY;
    return await AppDataSource.getRepository(EventList).countBy({
      timestamp: MoreThanOrEqual(Date.now() - timestamp),
      event:     In(['sub', 'resub']),
    });
  },
  '(count|follows|#)': async function (filter) {
    const timestamp: number = time[filter.replace('(count|follows|', '').slice(0, -1).toLowerCase()] ?? DAY;
    return await AppDataSource.getRepository(EventList).countBy({
      timestamp: MoreThanOrEqual(Date.now() - timestamp),
      event:     'follow',
    });
  },
  '(count|bits|#)': async function (filter) {
    const timestamp: number = time[filter.replace('(count|bits|', '').slice(0, -1).toLowerCase()] ?? DAY;
    const events = await AppDataSource.getRepository(UserBit).findBy({ cheeredAt: MoreThanOrEqual(Date.now() - timestamp) });
    return events.reduce((prev, cur) => {
      return prev += cur.amount;
    }, 0);
  },
  '(count|tips|#)': async function (filter) {
    const timestamp: number = time[filter.replace('(count|tips|', '').slice(0, -1).toLowerCase()] ?? DAY;
    const events = await AppDataSource.getRepository(UserTip).findBy({ tippedAt: MoreThanOrEqual(Date.now() - timestamp) });
    return events.reduce((prev, cur) => {
      return prev += cur.sortAmount;
    }, 0);
  },
};

export { count };