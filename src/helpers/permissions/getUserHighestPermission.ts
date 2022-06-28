import { Permissions } from '@entity/permissions';
import { getRepository } from 'typeorm';

import { addToCachedHighestPermission, getFromCachedHighestPermission } from './cache';

import { check } from '~/helpers/permissions/check';

async function getUserHighestPermission(userId: string, noCache = false): Promise<string> {
  const cachedPermission = noCache ? null : getFromCachedHighestPermission(userId);
  if (!cachedPermission) {
    const permissions = await getRepository(Permissions).find({
      order: { order: 'ASC' },
    });
    for (const p of permissions) {
      if ((await check(userId, p.id, true)).access) {
        addToCachedHighestPermission(userId, p.id);
        return p.id;
      }
    }
    throw new Error('Unknown permission for user ' + userId);
  } else {
    return cachedPermission;
  }
}

export { getUserHighestPermission };