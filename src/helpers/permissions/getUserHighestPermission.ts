import { Permissions } from '@entity/permissions.js';

import { check } from '~/helpers/permissions/check.js';

async function getUserHighestPermission(userId: string): Promise<string> {
  const permissions = await Permissions.find({
    order: { order: 'ASC' },
  });
  for (const p of permissions) {
    if ((await check(userId, p.id, true)).access) {
      return p.id;
    }
  }
  throw new Error('Unknown permission for user ' + userId);
}

export { getUserHighestPermission };