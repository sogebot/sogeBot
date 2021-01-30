import crypto from 'crypto';

import * as _ from 'lodash';
import { Brackets, getRepository } from 'typeorm';

import { EventList as EventListEntity } from '../database/entity/eventList';
import { warning } from '../helpers/log';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { isBotId } from '../helpers/user/isBot';
import users from '../users';
import eventlist from '../widgets/eventlist';
import Overlay from './_interface';

class EventList extends Overlay {
  showInUI = false;

  sockets () {
    adminEndpoint(this.nsp, 'eventlist::getUserEvents', async (userId, cb) => {
      const eventsByUserId = await getRepository(EventListEntity).find({ userId: userId });
      // we also need subgifts by giver
      const eventsByRecipientId
        = (await getRepository(EventListEntity).find({ event: 'subgift' }))
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
    publicEndpoint(this.nsp, 'getEvents', async (opts: { ignore: string; limit: number }, cb) => {
      let events = await getRepository(EventListEntity)
        .createQueryBuilder('events')
        .select('events')
        .orderBy('events.timestamp', 'DESC')
        .where(new Brackets(qb => {
          const ignored = opts.ignore.split(',').map(value => value.trim());
          for (let i = 0; i < ignored.length; i++) {
            qb.andWhere(`events.event != :event_${i}`, { ['event_' + i]: ignored[i] });
          }
        }))
        .limit(opts.limit)
        .getMany();
      if (events) {
        events = _.uniqBy(events, o =>
          (o.userId + (o.event === 'cheer' ? crypto.randomBytes(64).toString('hex') : o.event)),
        );
      }

      // we need to change userId => username and from => from username for eventlist compatibility
      const mapping = new Map() as Map<string, string>;
      for (const event of events) {
        const values = JSON.parse(event.values_json);
        if (values.from && values.from != '0') {
          if (!mapping.has(values.from)) {
            mapping.set(values.from, await users.getNameById(values.from));
          }
        }
        if (!mapping.has(event.userId)) {
          mapping.set(event.userId, await users.getNameById(event.userId));
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

    await getRepository(EventListEntity).save({
      event:       data.event,
      userId:      data.userId,
      timestamp:   Date.now(),
      isTest:      data.isTest ?? false,
      values_json: JSON.stringify(
        Object.keys(data)
          .filter(key => !['event', 'username', 'timestamp', 'isTest'].includes(key))
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