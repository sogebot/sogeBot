import { EventList } from '@entity/eventList';
import { HOUR } from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import eventlist from '../../overlays/eventlist';
import alerts from '../../registries/alerts';
import { triggerInterfaceOnFollow } from '../interface';
import { debug, follow as followLog } from '../log';
import {
  isBot, isIgnored, isInGlobalIgnoreList,
} from '../user';

import { eventEmitter } from '.';

import { tmiEmitter } from '~/helpers/tmi';

const events = new Map<string, number>();

export async function follow(userId: string, userName: string, followedAt: string) {
  if (events.has(userId)) {
    debug('events', `User ${userName}#${userId} already followed in hour.`);
    return;
  }
  events.set(userId, new Date(followedAt).getTime());

  if (isIgnored({ userName, userId })) {
    debug('events', `User ${userName}#${userId} is in ignore list.`);
    if (isInGlobalIgnoreList({ userName, userId })) {
      // autoban + autoblock
      tmiEmitter.emit('ban', userName);
      // remove from eventslit
      getRepository(EventList).delete({ userId });
    }
    return;
  }

  const followAlreadyExists = await getRepository(EventList).findOneBy({
    userId, event: 'follow', timestamp: new Date(followedAt).getTime(),
  });

  // skip events if already saved in db
  if (followAlreadyExists) {
    return;
  }

  // trigger events only if follow was in hour
  if (Date.now() - new Date(followedAt).getTime() < HOUR) {
    debug('events', `User ${userName}#${userId} triggered follow event.`);
    eventlist.add({
      event:     'follow',
      userId:    userId,
      timestamp: new Date(followedAt).getTime(),
    });
    if (!isBot(userName)) {
      followLog(`${userName}#${userId}`);
      eventEmitter.emit('follow', { userName, userId });
      alerts.trigger({
        event:      'follows',
        name:       userName,
        amount:     0,
        tier:       null,
        currency:   '',
        monthsName: '',
        message:    '',
      });

      triggerInterfaceOnFollow({
        userName, userId,
      });
    }

    // cleanup
    events.forEach((value, key) => {
      if (value + HOUR <= Date.now()) {
        events.delete(key);
      }
    });
  }
}