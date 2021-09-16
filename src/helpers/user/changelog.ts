import { MINUTE } from '@sogebot/ui-helpers/constants';
import {
  get as _get, cloneDeep, merge, set,
} from 'lodash';
import { getRepository } from 'typeorm';

import { User, UserInterface } from '../../database/entity/user';
import { flatten } from '../flatten.js';
import { debug } from '../log';
import { setImmediateAwait } from '../setImmediateAwait';

const changelog: (Partial<UserInterface> & { userId: string, changelogType: 'set' | 'increment' })[] = [];
const lock = new Map<string, boolean>();
let flushing = false;

const defaultData: Readonly<Required<UserInterface>> = {
  userId:                    '',
  username:                  '',
  watchedTime:               0,
  points:                    0,
  messages:                  0,
  subscribedAt:              0,
  subscribeTier:             '0',
  subscribeStreak:           0,
  pointsByMessageGivenAt:    0,
  pointsOfflineGivenAt:      0,
  pointsOnlineGivenAt:       0,
  profileImageUrl:           '',
  rank:                      '',
  seenAt:                    0,
  subscribeCumulativeMonths: 0,
  followCheckAt:             0,
  followedAt:                0,
  giftedSubscribes:          0,
  haveCustomRank:            false,
  haveFollowedAtLock:        false,
  haveFollowerLock:          false,
  haveSubscribedAtLock:      false,
  haveSubscriberLock:        false,
  isFollower:                false,
  isModerator:               false,
  isOnline:                  false,
  isSubscriber:              false,
  isVIP:                     false,
  chatTimeOffline:           0,
  chatTimeOnline:            0,
  createdAt:                 0,
  displayname:               '',
  extra:                     {},
};

export function update(userId: string,  data: Partial<UserInterface>) {
  changelog.push({
    ...cloneDeep(data), userId, changelogType: 'set',
  });
}
export function increment(userId: string,  data: Partial<UserInterface>) {
  changelog.push({
    ...cloneDeep(data), userId, changelogType: 'increment',
  });
}

export async function getOrFail(userId: string): Promise<Readonly<Required<UserInterface>>> {
  const data = await get(userId);
  if (!data) {
    throw new Error('User not found');
  }
  return data;
}

export async function get(userId: string): Promise<Readonly<Required<UserInterface>> | null> {
  await (async function isLocked(): Promise<void> {
    if (lock.get(userId)) {
      await setImmediateAwait();
      return isLocked();
    }
  })();

  const user = await getRepository(User).findOne({ userId });
  const data = cloneDeep(defaultData);
  merge(data, { userId }, user);

  for (const { changelogType, ...change } of changelog.filter(o => o.userId === userId)) {
    if (changelogType === 'set') {
      merge(data, change);
    } else if (changelogType === 'increment') {
      for (const path of Object.keys(flatten(change))) {
        if (path === 'userId') {
          continue;
        }
        set(data, path, _get(data, path, 0) + _get(change, path, 0));
      }
    }
  }

  if (typeof user === 'undefined' && changelog.filter(o => o.userId === userId).length === 0) {
    return null;
  }
  return data;
}

export async function flush() {
  debug('flush', 'start');
  await (async function isFlushing(): Promise<void> {
    if (flushing) {
      await setImmediateAwait();
      return isFlushing();
    }
  })();

  flushing = true;
  // prepare changes
  const length = changelog.length;

  const users = new Map<string, Partial<UserInterface>>();
  for (let i = 0; i < length; i++) {
    const { changelogType, ...change } = changelog.shift() as typeof changelog[number];

    // set lock for this userId
    lock.set(change.userId, true);

    if (!users.has(change.userId)) {
      // initial values
      const user = await getRepository(User).findOne({ userId: change.userId });
      const data = cloneDeep(defaultData);
      merge(data, { userId: change.userId }, user);
      users.set(change.userId, data);
    }

    if (changelogType === 'set') {
      users.set(change.userId, {
        ...users.get(change.userId) ?? {},
        ...change,
        userId: change.userId,
      });
    } else if (changelogType === 'increment') {
      const data = users.get(change.userId) ?? { userId: change.userId };
      for (const path of Object.keys(flatten(change))) {
        if (path === 'userId') {
          continue;
        }
        set(data, path, _get(data, path, 0) + _get(change, path, 0));
      }
      users.set(change.userId, data);
    }
  }

  for (const user of users.values()) {
    await getRepository(User).save(user);
  }
  lock.clear();
  flushing = false;
  debug('flush', 'done');
}

(async function flushInterval() {
  await flush();
  setTimeout(() => flushInterval(), MINUTE);
})();