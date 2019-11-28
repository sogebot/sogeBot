import * as _ from 'lodash';
import crypto from 'crypto';

import Overlay from './_interface';
import { isBot } from '../commons';
import { ui } from '../decorators';
import { publicEndpoint } from '../helpers/socket';

import { Brackets, getManager, getRepository } from 'typeorm';
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
    publicEndpoint(this.nsp, 'getEvents', async (opts: { ignore: string; limit: number }, cb) => {
      let events = await getManager().createQueryBuilder()
        .select('events').from(EventListEntity, 'events')
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
      cb(events);
    });
  }

  async add (data: EventList.Event) {
    if (isBot(data.username)) {
      return;
    } // don't save event from a bot

    const event = new EventListEntity();
    event.event = data.event;
    event.username = data.username;
    event.timestamp = Date.now();
    event.values_json = JSON.stringify(
      Object.keys(data)
        .filter(key => !['event', 'username', 'timestamp'].includes(key))
        .reduce((obj, key) => {
          return {
            ...obj,
            [key]: data[key],
          };
        }, {}),
    );
    await getRepository(EventListEntity).save(event);
    eventlist.update();
  }
}

export default new EventList();