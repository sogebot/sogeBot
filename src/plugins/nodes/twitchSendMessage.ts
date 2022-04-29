import { template } from '../template';

import type { Node } from '~/../d.ts/src/plugins';
import { tmiEmitter } from '~/helpers/tmi';
import { variables } from '~/watchers';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variablesArg: Record<string, any>, userstate: ChatUser) {
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  const message = await template(currentNode.data.value, { parameters, ...variablesArg }, userstate);
  tmiEmitter.emit('say', broadcasterUsername, message);
  return true;
}