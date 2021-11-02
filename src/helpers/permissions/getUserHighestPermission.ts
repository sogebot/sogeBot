import { Permissions } from '@entity/permissions';
import { getRepository } from 'typeorm';

import { addToCachedHighestPermission, getFromCachedHighestPermission } from './cache';

import { check } from '~/helpers/permissions/check';

async function getUserHighestPermission(userId: string): Promise<string> {
  const cachedPermission = getFromCachedHighestPermission(userId);
  if (!cachedPermission) {
    const permissions = await getRepository(Permissions).find({
      cache: true,
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