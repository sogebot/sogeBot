import { EventList } from '@entity/eventList';
import { Goal } from '@entity/goal';
import { UserBit, UserTip } from '@entity/user';
import { MINUTE } from '@sogebot/ui-helpers/constants';
import * as constants from '@sogebot/ui-helpers/constants';
import { In, MoreThanOrEqual } from 'typeorm';

import { mainCurrency } from '../currency';
import { isBotStarted } from '../database';

import { AppDataSource } from '~/database';
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
  const items = await AppDataSource.getRepository(Goal).find();
  for (const item of items) {
    let isChanged = false;
    for (const campaign of item.campaigns) {
      if (campaign.type === 'intervalBits') {
        isChanged = true;
        const events = await AppDataSource.getRepository(UserBit).findBy({ cheeredAt: MoreThanOrEqual(Date.now() - interval[campaign.interval!]) });
        campaign.currentAmount = events.reduce((prev, cur) => {
          return prev += cur.amount;
        }, 0);
      } else if (campaign.type === 'intervalTips') {
        isChanged = true;
        const events = await AppDataSource.getRepository(UserTip).findBy({ tippedAt: MoreThanOrEqual(Date.now() - interval[campaign.interval!]) });
        if (!campaign.countBitsAsTips) {
          campaign.currentAmount = events.reduce((prev, cur) => {
            return prev += cur.amount;
          }, 0);
        } else {
          const events2 = await AppDataSource.getRepository(UserBit).findBy({ cheeredAt: MoreThanOrEqual(Date.now() - interval[campaign.interval!]) });
          campaign.currentAmount = events.reduce((prev, cur) => {
            return prev += cur.sortAmount;
          }, 0) + events2.reduce((prev, cur) => {
            return prev += Number(exchange(cur.amount / 100, 'USD', mainCurrency.value));
          }, 0);
        }
      } else if (campaign.type === 'intervalFollowers') {
        campaign.currentAmount = await AppDataSource.getRepository(EventList).countBy({
          timestamp: MoreThanOrEqual(Date.now() - interval[campaign.interval!]),
          event:     'follow',
        });
      } else if (campaign.type === 'intervalSubscribers') {
        campaign.currentAmount =  await AppDataSource.getRepository(EventList).countBy({
          timestamp: MoreThanOrEqual(Date.now() - interval[campaign.interval!]),
          event:     In(['sub', 'resub']),
        });
      }
      isChanged ? await item.save() : null;
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