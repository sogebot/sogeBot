import crypto from 'crypto';

import { EventList as EventListEntity } from '@entity/eventList';
import * as _ from 'lodash';
import { Brackets } from 'typeorm';

import Overlay from './_interface';
import users from '../users';
import eventlist from '../widgets/eventlist';

import { AppDataSource } from '~/database';
import { warning } from '~/helpers/log';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import { isBotId } from '~/helpers/user/isBot';
import twitch from '~/services/twitch';

class EventList extends Overlay {
  showInUI = false;

  sockets () {
    adminEndpoint('/overlays/eventlist', 'eventlist::getUserEvents', async (userId, cb) => {
      const eventsByUserId = await AppDataSource.getRepository(EventListEntity).findBy({ userId: userId });
      // we also need subgifts by giver
      const eventsByRecipientId
        = (await AppDataSource.getRepository(EventListEntity).findBy({ event: 'subgift' }))
          .filter(o => JSON.parse(o.values_json).fromId === userId);
      const events =  _.orderBy([ ...eventsByRecipientId, ...eventsByUserId ], 'timestamp', 'desc');
      // we need to change userId => username and fromId => fromId username for eventlist compatibility
      const mapping = new Map() as Map<string, string>;
      for (const event of events) {
        const values = JSON.parse(event.values_json);
        if (values.fromId && values.fromId != '0') {
          if (!mapping.has(values.fromId)) {
            mapping.set(values.fromId, await users.getNameById(values.fromId));
          }
        }
        if (!mapping.has(event.userId)) {
          mapping.set(event.userId, await users.getNameById(event.userId));
        }
      }
      cb(null, events.map(event => {
        const values = JSON.parse(event.values_json);
        if (values.fromId && values.fromId != '0') {
          values.fromId = mapping.get(values.fromId);
        }
        return {
          ...event,
          username:    mapping.get(event.userId),
          values_json: JSON.stringify(values),
        };
      }));
    });
    publicEndpoint('/overlays/eventlist', 'getEvents', async (opts: { ignore: string[]; limit: number }, cb) => {
      let events = await AppDataSource.getRepository(EventListEntity)
        .createQueryBuilder('events')
        .select('events')
        .orderBy('events.timestamp', 'DESC')
        .where(new Brackets(qb => {
          const ignored = opts.ignore.map(value => value.trim());
          for (let i = 0; i < ignored.length; i++) {
            qb.andWhere(`events.event != :event_${i}`, { ['event_' + i]: ignored[i] });
            qb.andWhere(`events.isHidden != :isHidden`, { ['isHidden']: false });
          }
        }))
        .limit(opts.limit)
        .getMany();
      if (events) {
        events = _.uniqBy(events, o =>
          (o.userId + (['cheer', 'rewardredeem'].includes(o.event) ? crypto.randomBytes(64).toString('hex') : o.event)),
        );
      }

      // we need to change userId => username and from => from username for eventlist compatibility
      const mapping = new Map() as Map<string, string>;
      for (const event of events) {
        try {
          const values = JSON.parse(event.values_json);
          if (values.from && values.from != '0') {
            if (!mapping.has(values.from)) {
              mapping.set(values.from, await users.getNameById(values.from));
            }
          }
          if (!mapping.has(event.userId)) {
            mapping.set(event.userId, await users.getNameById(event.userId));
          }
        } catch (e) {
          console.error(e);
        }
      }

      cb(null, events.map(event => {
        const values = JSON.parse(event.values_json);
        if (values.from && values.from != '0') {
          values.from = mapping.get(values.from);
        }
        return {
          ...event,
          username:    mapping.get(event.userId),
          values_json: JSON.stringify(values),
        };
      }));
    });
  }

  async add (data: EventList.Event) {
    if (!data.userId.includes('__anonymous__') && isBotId(data.userId)) {
      warning(`Event ${data.event} won't be saved in eventlist, coming from bot account.`);
      return;
    } // don't save event from a bot

    if (!data.userId.includes('__anonymous__')) {
      users.getNameById(data.userId).then((username) => {
        let description = username;
        if (data.event === 'tip') {
          description = `${data.amount} ${data.currency}`;
        }
        twitch.addEventToMarker(data.event, description);
      });
    }

    await AppDataSource.getRepository(EventListEntity).save({
      event:       data.event,
      userId:      data.userId,
      timestamp:   Date.now(),
      isTest:      data.isTest ?? false,
      values_json: JSON.stringify(
        Object.keys(data)
          .filter(key => !['event', 'userId', 'timestamp', 'isTest'].includes(key))
          .reduce((obj, key) => {
            return {
              ...obj,
              [key]: (data as any)[key],
            };
          }, {}),
      ),
    });
    eventlist.askForGet();
  }
}

export default new EventList();