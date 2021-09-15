import { MINUTE } from '@sogebot/ui-helpers/constants';
import { cloneDeep, merge } from 'lodash';
import { getRepository } from 'typeorm';

import { User, UserInterface } from '../../database/entity/user';
import { debug } from '../log';
import { setImmediateAwait } from '../setImmediateAwait';

const changelog: (Partial<UserInterface> & { userId: string })[] = [];
const lock = new Map<string, boolean>();

export function update(userId: string,  data: Partial<UserInterface>) {
  changelog.push({ ...cloneDeep(data), userId });
}

export async function get(userId: string) {
  await (async function isLocked(): Promise<void> {
    if (lock.get(userId)) {
      await setImmediateAwait();
      return isLocked();
    }
  })();

  const user = await getRepository(User).findOne({ userId });
  const data: UserInterface = {
    userId:                    userId,
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
  merge(data, user, ...changelog.filter(o => o.userId === userId));

  if (typeof user === 'undefined' && changelog.filter(o => o.userId === userId).length === 0) {
    return null;
  }
  return data;
}

export async function flush() {
  debug('flush', 'start');
  // prepare changes
  const length = changelog.length;

  const users = new Map<string, Partial<UserInterface>>();
  for (let i = 0; i < length; i++) {
    const change = changelog.shift() as typeof changelog[number];

    // set lock for this userId
    lock.set(change.userId, true);

    users.set(change.userId, {
      ...users.get(change.userId) ?? {},
      ...change,
    });
  }

  for (const user of users.values()) {
    await getRepository(User).save(user);
  }
  lock.clear();
  debug('flush', 'done');
}

(async function flushInterval() {
  await flush();
  setTimeout(() => flushInterval(), MINUTE);
})();