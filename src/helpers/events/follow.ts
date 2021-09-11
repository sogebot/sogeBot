import { HOUR } from '@sogebot/ui-helpers/constants';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import { getRepository } from 'typeorm';

import { User } from '../../database/entity/user';
import { fetchUser } from '../../microservices/fetchUser';
import eventlist from '../../overlays/eventlist';
import alerts from '../../registries/alerts';
import tmi from '../../tmi';
import { triggerInterfaceOnFollow } from '../interface';
import {
  debug, error, follow as followLog,
} from '../log';
import {
  isBot, isIgnored, isInGlobalIgnoreList, 
} from '../user';

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
    followLog(username);
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

    getRepository(User).findOneOrFail({ userId })
      .then(user => {
        getRepository(User).update({ userId },
          {
            followedAt:    user.haveFollowedAtLock ? user.followedAt : dayjs(followedAt).valueOf(),
            isFollower:    user.haveFollowerLock? user.isFollower : true,
            followCheckAt: Date.now(),
          });
      })
      .catch(() => {
        fetchUser(userId).then(user => {
          getRepository(User).save({
            userId,
            username:        user.login,
            profileImageUrl: user.profile_image_url,
            followedAt:      dayjs(followedAt).valueOf(),
            isFollower:      true,
            followCheckAt:   Date.now(),
          });
        }).catch((e) => {
          error('Something went wrong during follow event processing.');
          if (e instanceof Error) {
            error(e.stack);
          }
        });
      });

    events.set(userId, Date.now());
  }
}