import { DAY, HOUR } from '@sogebot/ui-helpers/constants';
import {
  getRepository, In, MoreThanOrEqual,
} from 'typeorm';

import { EventList } from '../database/entity/eventList';
import { UserBit, UserTip } from '../database/entity/user';

import type { ResponseFilter } from '.';

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
    return await getRepository(EventList).count({
      timestamp: MoreThanOrEqual(Date.now() - timestamp),
      event:     In(['sub', 'resub']),
    });
  },
  '(count|follows|#)': async function (filter) {
    const timestamp: number = time[filter.replace('(count|follows|', '').slice(0, -1).toLowerCase()] ?? DAY;
    return await getRepository(EventList).count({
      timestamp: MoreThanOrEqual(Date.now() - timestamp),
      event:     'follow',
    });
  },
  '(count|bits|#)': async function (filter) {
    const timestamp: number = time[filter.replace('(count|bits|', '').slice(0, -1).toLowerCase()] ?? DAY;
    const events = await getRepository(UserBit).find({ cheeredAt: MoreThanOrEqual(Date.now() - timestamp) });
    return events.reduce((prev, cur) => {
      return prev += cur.amount;
    }, 0);
  },
  '(count|tips|#)': async function (filter) {
    const timestamp: number = time[filter.replace('(count|tips|', '').slice(0, -1).toLowerCase()] ?? DAY;
    const events = await getRepository(UserTip).find({ tippedAt: MoreThanOrEqual(Date.now() - timestamp) });
    return events.reduce((prev, cur) => {
      return prev += cur.sortAmount;
    }, 0);
  },
};

export { count };