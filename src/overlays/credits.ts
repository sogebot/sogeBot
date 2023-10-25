import { EventList, EventListInterface } from '@entity/eventList.js';
import _ from 'lodash-es';
import { MoreThanOrEqual } from 'typeorm';

import Overlay from './_interface.js';
import users from '../users.js';

import type { Currency } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import { publicEndpoint } from '~/helpers/socket.js';
import { getTopClips } from '~/services/twitch/calls/getTopClips.js';
import { variables } from '~/watchers.js';

export type Event = (EventListInterface & { username?: string, values?: {
  currency: Currency;
  amount: number;
  fromId?: string;
  fromUsername?: string;
  subCumulativeMonths?: number;
  subCumulativeMonthsName?: string;
  bits?: number;
  count?: number;
  viewers?: number;
  titleOfReward?: string;
} & Event});

class Credits extends Overlay {
  sockets () {
    publicEndpoint(this.nsp, 'getClips', async(opts, cb) => {
      if (opts.show) {
        const clips = await getTopClips({
          period: opts.period, days: opts.periodValue, first: opts.numOfClips,
        });
        cb(await Promise.all(
          clips.map(async (o) => {
            return {
              creatorDisplayName: o.creatorDisplayName,
              title:              o.title,
              duration:           o.duration,
              game:               o.game,
              mp4:                o.mp4,
            };
          }),
        ));
      } else {
        cb([]);
      }
    });
    publicEndpoint(this.nsp, 'load', async (cb) => {
      const when = isStreamOnline.value ? streamStatusChangeSince.value : Date.now() - 50000000000;
      const timestamp = new Date(when).getTime();
      const events: Event[] = await AppDataSource.getRepository(EventList).find({
        order: { timestamp: 'DESC' },
        where: { timestamp: MoreThanOrEqual(timestamp), isHidden: false },
      });

      // we need to map usernames
      const userIds = events.map(o => o.userId);
      const fromIds =  events.filter(o => 'fromId' in (o.values ?? {})).map(o => o.values!.fromId!);
      const mapping = await users.getUsernamesFromIds(Array.from(new Set([
        ...userIds,
        ...fromIds,
      ])));
      for (const event of events) {
        event.username = mapping.get(event.userId) ?? 'n/a';
      }

      // change tips if neccessary for aggregated events (need same currency)
      for (const event of events) {
        event.values = JSON.parse(event.values_json);
        if (event.values) {
          if (event.values.fromId) {
            event.values.fromUsername = mapping.get(event.values.fromId) ?? 'n/a';
          }
          if (!_.isNil(event.values.amount) && !_.isNil(event.values.currency)) {
            event.values.amount = exchange(event.values.amount, event.values.currency, mainCurrency.value);
            event.values.currency = mainCurrency.value;
          }
        }
      }
      const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

      cb(null, {
        streamer: broadcasterUsername,
        game:     stats.value.currentGame,
        title:    stats.value.currentTitle,
        events,
      });
    });
  }
}

export default new Credits();
