import type { Node } from '~/../d.ts/src/plugins';
import { info } from '~/helpers/log';
import { tmiEmitter } from '~/helpers/tmi';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  if (userstate) {
    info(`PLUGINS#${pluginId}: Banning user ${userstate.userName}#${userstate.userId}`);
    tmiEmitter.emit('ban', userstate.userName);
  }
  return true;
}