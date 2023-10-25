import { debug } from '~/helpers/log.js';
import { check } from '~/helpers/permissions/check.js';

export const PermissionGenerator = (pluginId: string) => ({
  accessTo: async (userId: string, permId: string) => {
    debug('plugins', `PLUGINS#${pluginId}: accessTo ${permId}`);
    return (await check(userId, permId, false)).access;
  },
});