import { Permissions } from '@entity/permissions.js';

import { check } from '~/helpers/permissions/check.js';

async function getUserPermissionsList(userId: string, noCache = false): Promise<string[]> {
  const list: string[] = [];
  const permissions = await Permissions.find({
    order: { order: 'ASC' },
  });
  for (const p of permissions) {
    if ((await check(userId, p.id, true)).access) {
      list.push(p.id);
    }
  }
  return list;
}

export { getUserPermissionsList };