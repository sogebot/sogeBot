import { EventList } from '@entity/eventList.js';
import { Goal, Overlay } from '@entity/overlay.js';
import { UserBit, UserTip } from '@entity/user.js';
import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import { In, MoreThanOrEqual } from 'typeorm';

import { mainCurrency } from '../currency/index.js';
import { isBotStarted } from '../database.js';

import { AppDataSource } from '~/database.js';
import exchange from '~/helpers/currency/exchange.js';

export const types = ['bits', 'tips', 'followers', 'subscribers'] as const;

const interval = {
  'hour':  constants.HOUR,
  'day':   constants.DAY,
  'week':  7 * constants.DAY,
  'month': 31 * constants.DAY,
  'year':  365 * constants.DAY,
} as const;

export async function recountIntervals() {
  const overlays = await Overlay.find();
  for (const overlay of overlays) {
    let isChanged = false;
    const goals = overlay.items.filter(o => o.opts.typeId === 'goal');
    for (const goal of goals) {
      goal.opts = goal.opts as Goal;
      for (const campaign of goal.opts.campaigns ?? []) {
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
      }
    }
    isChanged && await overlay.save();
  }
}

setInterval(async () => {
  if (isBotStarted) {
    await recountIntervals();
  }
}, (5 * MINUTE));