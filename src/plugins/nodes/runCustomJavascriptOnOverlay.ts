import type { Node } from '~/../d.ts/src/plugins';
import { error } from '~/helpers/log';
import { ioServer } from '~/helpers/panel';

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  try {
    const nodeId = currentNode.data.value;
    const script = JSON.parse(currentNode.data.data);
    const sandbox = {
      sender: userstate ? {
        userName: userstate.userName,
        userId:   userstate.userId,
      } : null,
      parameters,
      ...variables,
    };
    ioServer?.of('core/plugins').emit(`plugins::${nodeId}::runScript`, { sandbox, script });
    return true;
  } catch (e) {
    error(`PLUGINS#${pluginId}: ${(e as Error).stack}`);
    return false;
  }
}