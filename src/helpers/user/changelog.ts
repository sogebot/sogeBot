import { User, UserInterface } from '@entity/user.js';
import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import {
  get as _get, cloneDeep, merge, set,
} from 'lodash-es';
import { v4 } from 'uuid';

import { timer } from '../../decorators.js';
import { flatten } from '../flatten.js';
import { debug, error } from '../log.js';

import { AppDataSource } from '~/database.js';

const changelog: (Partial<UserInterface> & { userId: string, changelogType: 'set' | 'increment' })[] = [];
const lock = new Map<string, boolean>();

const defaultData: Readonly<Required<UserInterface>> = {
  userId:                    '',
  userName:                  '',
  watchedTime:               0,
  points:                    0,
  messages:                  0,
  subscribeTier:             '0',
  subscribeStreak:           0,
  pointsByMessageGivenAt:    0,
  pointsOfflineGivenAt:      0,
  pointsOnlineGivenAt:       0,
  profileImageUrl:           '',
  rank:                      '',
  subscribeCumulativeMonths: 0,
  seenAt:                    null,
  subscribedAt:              null,
  createdAt:                 null,
  giftedSubscribes:          0,
  haveCustomRank:            false,
  haveSubscribedAtLock:      false,
  haveSubscriberLock:        false,
  isModerator:               false,
  isOnline:                  false,
  isSubscriber:              false,
  isVIP:                     false,
  chatTimeOffline:           0,
  chatTimeOnline:            0,
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

function checkLock(userId: string, resolve: (value: unknown) => void) {
  if (!lock.get(userId)) {
    resolve(true);
  } else {
    setImmediate(() => checkLock(userId, resolve));
  }
}

class Changelog {
  @timer()
  async get(userId: string): Promise<Readonly<Required<UserInterface>> | null> {
    await new Promise((resolve) => {
      checkLock(userId, resolve);
    });

    const user = await AppDataSource.getRepository(User).findOneBy({ userId });
    const data = cloneDeep(defaultData);
    merge(data, { userId }, user ?? {});

    for (const { changelogType, ...change } of changelog.filter(o => o.userId === userId)) {
      if (changelogType === 'set') {
        merge(data, change);
      } else if (changelogType === 'increment') {
        for (const path of Object.keys(flatten(change))) {
          if (path === 'userId') {
            continue;
          }

          const value = _get(data, path, 0) + _get(change, path, 0);
          if (path === 'points' && value < 0) {
            set(data, path, 0);
          } else {
            set(data, path, value);
          }
        }
      }
    }

    if (!user && changelog.filter(o => o.userId === userId).length === 0) {
      return null;
    }
    return data;
  }
}
const self = new Changelog();

export async function get(userId: string): Promise<Readonly<Required<UserInterface>> | null> {
  return self.get(userId);
}

function checkQueue(id: string, resolve: (value: unknown) => void, reject: (reason?: any) => void) {
  debug('flush', `queue: ${flushQueue.join(', ')}`);
  if (changelog.length === 0) {
    // nothing to do, just reject, no point to wait
    flushQueue.splice(flushQueue.indexOf(id) ,1);
    reject();
  } else {
    debug('flush', `checking if ${id} should run`);
    // this flush should start
    if (flushQueue[0] === id) {
      resolve(true);
    } else {
      setImmediate(() => checkQueue(id, resolve, reject));
    }
  }
}

const flushQueue: string[] = [];
export async function flush() {
  debug('flush', `queued - ${flushQueue.length}`);
  if (changelog.length === 0) {
    // don't event start
    debug('flush', 'empty');
    return;
  }
  const id = v4();
  flushQueue.push(id);
  debug('flush', `start - ${id}`);
  try {
    await new Promise((resolve, reject) => {
      checkQueue(id, resolve, reject);
    });
  } catch (e) {
    debug('flush', `skip - ${id}`);
    return;
  }

  debug('flush', `progress - ${id} - changes: ${changelog.length}`);

  // prepare changes
  const length = changelog.length;

  const users = new Map<string, Partial<UserInterface>>();
  for (let i = 0; i < length; i++) {
    const shift = changelog.shift() as typeof changelog[number];
    const { changelogType, ...change } = shift;

    // set lock for this userId
    lock.set(change.userId, true);

    if (!users.has(change.userId)) {
      // initial values
      const user = await AppDataSource.getRepository(User).findOneBy({ userId: change.userId });
      const data = cloneDeep(defaultData);
      merge(data, { userId: change.userId }, user ?? {});
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

        const value = _get(data, path, 0) + _get(change, path, 0);
        if (path === 'points' && value < 0) {
          set(data, path, 0);
        } else {
          set(data, path, value);
        }
      }
      users.set(change.userId, data);
    }
  }

  for (const user of users.values()) {
    try {
      await AppDataSource.getRepository(User).save(user);
    } catch (e) {
      if (e instanceof Error) {
        error(e.stack);
      }
    }
  }
  lock.clear();

  flushQueue.splice(flushQueue.indexOf(id) ,1);
  debug('flush', `done - ${id}`);
}

(async function flushInterval() {
  await flush();
  setTimeout(() => flushInterval(), MINUTE);
})();