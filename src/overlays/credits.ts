import { EventList, EventListInterface } from '@entity/eventList';
import _ from 'lodash';
import { getRepository, MoreThanOrEqual } from 'typeorm';

import users from '../users';
import Overlay from './_interface';

import type { Currency } from '~/database/entity/user';
import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api';
import { mainCurrency } from '~/helpers/currency';
import exchange from '~/helpers/currency/exchange';
import { publicEndpoint } from '~/helpers/socket';
import { getTopClips } from '~/services/twitch/calls/getTopClips';
import { variables } from '~/watchers';

class Credits extends Overlay {
  sockets () {
    publicEndpoint(this.nsp, 'getClips', async(opts, cb) => {
      cb(opts.show ? await getTopClips({
        period: opts.period, days: opts.periodValue, first: opts.numOfClips,
      }) : [],
      );
    });
    publicEndpoint(this.nsp, 'load', async (cb) => {
      const when = isStreamOnline.value ? streamStatusChangeSince.value : Date.now() - 50000000000;
      const timestamp = new Date(when).getTime();
      const events: (EventListInterface & { username?: string, values?: {
        currency: Currency; amount: number;
      };})[] = await getRepository(EventList).find({
        order: { timestamp: 'DESC' },
        where: { timestamp: MoreThanOrEqual(timestamp) },
      });

      // we need to map usernames
      const mapping = await users.getUsernamesFromIds(events.map(o => o.userId));
      for (const event of events) {
        event.username = mapping.get(event.userId) ?? 'n/a';
      }

      // change tips if neccessary for aggregated events (need same currency)
      for (const event of events) {
        event.values = JSON.parse(event.values_json);
        if (event.values) {
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
