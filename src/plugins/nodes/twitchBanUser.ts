import type { Node } from '~/../d.ts/src/plugins';
import { info } from '~/helpers/log';
import banUser from '~/services/twitch/calls/banUser';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  if (userstate) {
    info(`PLUGINS#${pluginId}: Banning user ${userstate.userName}#${userstate.userId}`);
    banUser(userstate.userId);
  }
  return true;
}