import { debug } from '~/helpers/log';
import { check } from '~/helpers/permissions/check';

export const PermissionGenerator = (pluginId: string) => ({
  accessTo: async (userId: string, permId: string) => {
    debug('plugins', `PLUGINS#${pluginId}: accessTo ${permId}`);
    return check(userId, permId, false);
  },
});