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
import * as changelog from '../user/changelog.js';

import { eventEmitter } from '.';

import { tmiEmitter } from '~/helpers/tmi';

const events = new Map<string, number>();

export function follow(userId: string, userName: string, followedAt: string) {
  // cleanup
  events.forEach((value, key) => {
    if (value + HOUR <= Date.now()) {
      events.delete(key);
    }
  });

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

  changelog.getOrFail(userId)
    .then(user => {
      changelog.update(userId, {
        followedAt:    user.haveFollowedAtLock ? user.followedAt : followedAt,
        isFollower:    user.haveFollowerLock? user.isFollower : true,
        followCheckAt: Date.now(),
      });
    })
    .catch(() => {
      changelog.update(userId, {
        userName:      userName,
        followedAt:    followedAt,
        isFollower:    true,
        followCheckAt: Date.now(),
      });
    });

  if (events.has(userId)) {
    debug('events', `User ${userName}#${userId} already followed in hour.`);
    return;
  }

  // trigger events only if follow was in hour
  if (Date.now() - new Date(followedAt).getTime() < HOUR) {
    debug('events', `User ${userName}#${userId} triggered follow event.`);
    eventlist.add({
      event:     'follow',
      userId:    userId,
      timestamp: Date.now(),
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

    events.set(userId, Date.now());
  }
}