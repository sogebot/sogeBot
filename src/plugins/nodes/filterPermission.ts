import type { Node } from '~/../d.ts/src/plugins';
import { check } from '~/helpers/permissions/check';

export default async function(pluginId: string, currentNode: Node<string[]>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const permissionsAccessList = currentNode.data.value;
  let haveAccess = false;
  for (const permId of permissionsAccessList) {
    if (haveAccess) {
      break;
    }
    if (userstate) {
      const status = await check(userstate.userId, permId);
      haveAccess = status.access;
    }
  }
  return haveAccess;
}