import { getRepository } from 'typeorm';

import { HOUR, MINUTE } from '../../constants';
import { User } from '../../database/entity/user';
import { debug } from '../log';
import { logAvgTime } from '../profiler';
import { setImmediateAwait } from '../setImmediateAwait';
import { getUserHighestPermission } from './getUserHighestPermission';

let isRecacheRunning = false;
let rechacheFinishedAt = 0;
const recacheIds = new Map<number, number>();

export let cachedViewers: {
  [userId: number]: {
    [permId: string]: boolean;
  };
} = {};

let cachedHighestPermission: {
  [userId: number]: string | undefined;
} = {};

export function cleanViewersCache (userId?: number): void {
  if (typeof userId === 'number') {
    delete cachedViewers[userId];
    delete cachedHighestPermission[userId];
  } else {
    cachedViewers = {};
    cachedHighestPermission = {};
  }
}

export const getFromCachedHighestPermission = (userId: number | string) => {
  userId = Number(userId);
  return cachedHighestPermission[userId];
};

export const getFromViewersCache = (userId: number | string, permId: string) => {
  userId = Number(userId);
  const permList = cachedViewers[userId];
  if (permList) {
    return permList[permId];
  } else {
    return undefined;
  }
};

export const addToViewersCache = (userId: number | string, permId: string, haveAccess: boolean) => {
  userId = Number(userId);
  if (typeof cachedViewers[userId] === 'undefined') {
    cachedViewers[userId] = {};
  }
  cachedViewers[userId][permId] = haveAccess;
};

export const addToCachedHighestPermission = (userId: number | string, permId: string) => {
  userId = Number(userId);
  cachedHighestPermission[userId] = permId;
};

export function recacheOnlineUsersPermission() {
  if (!isRecacheRunning && Date.now() - rechacheFinishedAt > 10 * MINUTE) {
    const time = process.hrtime();
    getRepository(User).find({ isOnline: true }).then(async (users2) => {
      isRecacheRunning = true;
      // we need to recache only users not recached in 30 minutes
      for (const user of users2) {
        if (!recacheIds.has(user.userId) || (Date.now() - (recacheIds.get(user.userId) ?? 0) > 30 * MINUTE)) {
          debug('permissions.recache', `Recaching ${user.username}#${user.userId}`);
          cleanViewersCache(user.userId);
          await getUserHighestPermission(user.userId);
          await setImmediateAwait();
          recacheIds.set(user.userId, Date.now());
        } else {
          debug('permissions.recache', `Recaching SKIPPED ${user.username}#${user.userId}`);
        }
      }
      isRecacheRunning = false;
      rechacheFinishedAt = Date.now();
      logAvgTime('recacheOnlineUsersPermission()', process.hrtime(time));
    });
  }

  // remove all recacheIds when time is more than HOUR
  for (const userId of Array.from(recacheIds.keys())) {
    if (Date.now() - (recacheIds.get(userId) ?? 0) > HOUR) {
      recacheIds.delete(userId);
    }
  }
}