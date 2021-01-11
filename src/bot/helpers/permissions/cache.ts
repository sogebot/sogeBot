import { defaultPermissions } from './defaultPermissions';

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
  return cachedHighestPermission[userId] ?? defaultPermissions.VIEWERS;
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