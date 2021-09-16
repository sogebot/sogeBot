import { HOUR } from '@sogebot/ui-helpers/constants';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';

import eventlist from '../../overlays/eventlist';
import alerts from '../../registries/alerts';
import tmi from '../../tmi';
import { triggerInterfaceOnFollow } from '../interface';
import { debug, follow as followLog } from '../log';
import {
  isBot, isIgnored, isInGlobalIgnoreList,
} from '../user';
import * as changelog from '../user/changelog.js';

import { eventEmitter } from '.';

const events = new Map<string, number>();

export function follow(userId: string, username: string, followedAt: string | number) {
  // cleanup
  events.forEach((value, key) => {
    if (value + HOUR <= Date.now()) {
      events.delete(key);
    }
  });

  if (isIgnored({ username, userId })) {
    debug('events', `User ${username}#${userId} is in ignore list.`);
    if (isInGlobalIgnoreList({ username, userId })) {
      // autoban + autoblock
      tmi.ban(username);
    }
    return;
  }

  if (events.has(userId)) {
    debug('events', `User ${username}#${userId} already followed in hour.`);
    return;
  }

  eventlist.add({
    event:     'follow',
    userId:    userId,
    timestamp: Date.now(),
  });
  if (!isBot(username)) {
    followLog(`${username}#${userId}`);
    eventEmitter.emit('follow', { username: username, userId: userId });
    alerts.trigger({
      event:      'follows',
      name:       username,
      amount:     0,
      tier:       null,
      currency:   '',
      monthsName: '',
      message:    '',
    });

    triggerInterfaceOnFollow({
      username: username,
      userId:   userId,
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
          username:      username,
          followedAt:    dayjs(followedAt).valueOf(),
          isFollower:    true,
          followCheckAt: Date.now(),
        });
      });

    events.set(userId, Date.now());
  }
}