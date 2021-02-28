export let cachedViewers: {
  [userId: string]: {
    [permId: string]: boolean;
  };
} = {};

let cachedHighestPermission: {
  [userId: string]: string | undefined;
} = {};

export function cleanViewersCache (userId?: string): void {
  if (typeof userId !== 'undefined') {
    delete cachedViewers[userId];
    delete cachedHighestPermission[userId];
  } else {
    cachedViewers = {};
    cachedHighestPermission = {};
  }
}

export const getFromCachedHighestPermission = (userId: string) => {
  return cachedHighestPermission[userId];
};

export const getFromViewersCache = (userId: string, permId: string) => {
  const permList = cachedViewers[userId];
  if (permList) {
    return permList[permId];
  } else {
    return undefined;
  }
};

export const addToViewersCache = (userId: string, permId: string, haveAccess: boolean) => {
  if (typeof cachedViewers[userId] === 'undefined') {
    cachedViewers[userId] = {};
  }
  cachedViewers[userId][permId] = haveAccess;
};

export const addToCachedHighestPermission = (userId: string, permId: string) => {
  cachedHighestPermission[userId] = permId;
};