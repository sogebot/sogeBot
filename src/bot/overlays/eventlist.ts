import * as _ from 'lodash';
import crypto from 'crypto';

import Overlay from './_interface';
import { isBot } from '../commons';
import { ui } from '../decorators';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';

import { Brackets, getRepository } from 'typeorm';
import { EventList as EventListEntity } from '../database/entity/eventList';
import eventlist from '../widgets/eventlist';

class EventList extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/eventlist',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/eventlist (350x220)',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  sockets () {
    adminEndpoint(this.nsp, 'eventlist::getUserEvents', async (username, cb) => {
      const eventsByUsername = await getRepository(EventListEntity).find({username});
      // we also need subgifts by giver
      const eventsByRecipient
        = (await getRepository(EventListEntity).find({event:'subgift'}))
          .filter(o => JSON.parse(o.values_json).from === username);
      cb(null, _.orderBy([ ...eventsByRecipient, ...eventsByUsername ], 'timestamp', 'desc'));

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
          (o.username + (o.event === 'cheer' ? crypto.randomBytes(64).toString('hex') : o.event))
        );
      }
      cb(null, events);
    });
  }

  async add (data: EventList.Event) {
    if (isBot(data.username)) {
      return;
    } // don't save event from a bot

    await getRepository(EventListEntity).save({
      event: data.event,
      username: data.username,
      timestamp: Date.now(),
      isTest: data.isTest ?? false,
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
    eventlist.update();
  }
}

export default new EventList();