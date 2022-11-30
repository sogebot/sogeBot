import { EventList } from '@entity/eventList';
import { Goal, GoalInterface } from '@entity/goal';
import { UserBit, UserTip } from '@entity/user';
import { MINUTE } from '@sogebot/ui-helpers/constants';
import * as constants from '@sogebot/ui-helpers/constants';
import { AppDataSource } from '~/database';
import { In, MoreThanOrEqual } from 'typeorm';

import { mainCurrency } from '../currency';
import { isBotStarted } from '../database';

import exchange from '~/helpers/currency/exchange';

export const types = ['bits', 'tips', 'followers', 'subscribers'] as const;

const interval = {
  'hour':  constants.HOUR,
  'day':   constants.DAY,
  'week':  7 * constants.DAY,
  'month': 31 * constants.DAY,
  'year':  365 * constants.DAY,
} as const;

export async function recountIntervals(type: typeof types[number]) {
  const items = (await AppDataSource.getRepository(Goal).findBy({ type: 'interval' + type.charAt(0).toUpperCase() + type.slice(1) as GoalInterface['type'] }))
    .filter(item => {
      return item.endAfterIgnore || new Date(item.endAfter).getTime() > Date.now();
    });

  for (const item of items) {
    if (item.type === 'intervalBits') {
      const events = await AppDataSource.getRepository(UserBit).findBy({ cheeredAt: MoreThanOrEqual(Date.now() - interval[item.interval]) });
      await AppDataSource.getRepository(Goal).save({
        ...item,
        currentAmount: events.reduce((prev, cur) => {
          return prev += cur.amount;
        }, 0),
      });
    } else if (item.type === 'intervalTips') {
      const events = await AppDataSource.getRepository(UserTip).findBy({ tippedAt: MoreThanOrEqual(Date.now() - interval[item.interval]) });
      if (!item.countBitsAsTips) {
        await AppDataSource.getRepository(Goal).save({
          ...item,
          currentAmount: events.reduce((prev, cur) => {
            return prev += cur.sortAmount;
          }, 0),
        });
      } else {
        const events2 = await AppDataSource.getRepository(UserBit).findBy({ cheeredAt: MoreThanOrEqual(Date.now() - interval[item.interval]) });
        await AppDataSource.getRepository(Goal).save({
          ...item,
          currentAmount: events.reduce((prev, cur) => {
            return prev += cur.sortAmount;
          }, 0) + events2.reduce((prev, cur) => {
            return prev += Number(exchange(cur.amount / 100, 'USD', mainCurrency.value));
          }, 0),
        });
      }
    } else if (item.type === 'intervalFollowers') {
      await AppDataSource.getRepository(Goal).save({
        ...item,
        currentAmount: await AppDataSource.getRepository(EventList).countBy({
          timestamp: MoreThanOrEqual(Date.now() - interval[item.interval]),
          event:     'follow',
        }),
      });
    } else if (item.type === 'intervalSubscribers') {
      await AppDataSource.getRepository(Goal).save({
        ...item,
        currentAmount: await AppDataSource.getRepository(EventList).countBy({
          timestamp: MoreThanOrEqual(Date.now() - interval[item.interval]),
          event:     In(['sub', 'resub']),
        }),
      });
    }
  }
}

setInterval(async () => {
  if (isBotStarted) {
    for (const type of types) {
      await recountIntervals(type);
    }
  }
}, MINUTE);