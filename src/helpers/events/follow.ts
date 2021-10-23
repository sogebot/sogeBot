import { HOUR } from '@sogebot/ui-helpers/constants';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import { getRepository } from 'typeorm';

import tmi from '../../chat';
import { EventList } from '../../database/entity/eventList';
import eventlist from '../../overlays/eventlist';
import alerts from '../../registries/alerts';
import { triggerInterfaceOnFollow } from '../interface';
import { debug, follow as followLog } from '../log';
import {
  isBot, isIgnored, isInGlobalIgnoreList,
} from '../user';
import * as changelog from '../user/changelog.js';

import { eventEmitter } from '.';

const events = new Map<string, number>();

export function follow(userId: string, userName: string, followedAt: string | number) {
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
      tmi.ban(userName);
      // remove from eventslit
      getRepository(EventList).delete({ userId });
    }
    return;
  }

  if (events.has(userId)) {
    debug('events', `User ${userName}#${userId} already followed in hour.`);
    return;
  }

  eventlist.add({
    event:     'follow',
    userId:    userId,
    timestamp: Date.now(),
  });
  if (!isBot(userName)) {
    followLog(`${userName}#${userId}`);
    eventEmitter.emit('follow', { userName, userId: userId });
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

    changelog.getOrFail(userId)
      .then(user => {
        changelog.update(userId, {
          followedAt:    user.haveFollowedAtLock ? user.followedAt : dayjs(followedAt).valueOf(),
          isFollower:    user.haveFollowerLock? user.isFollower : true,
          followCheckAt: Date.now(),
        });
      })
      .catch(() => {
        changelog.update(userId, {
          userName:      userName,
          followedAt:    dayjs(followedAt).valueOf(),
          isFollower:    true,
          followCheckAt: Date.now(),
        });
      });

    events.set(userId, Date.now());
  }
}