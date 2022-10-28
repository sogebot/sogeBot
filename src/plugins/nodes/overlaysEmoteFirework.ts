import type { Node } from '~/../d.ts/src/plugins';
import emitter from '~/helpers/interfaceEmitter';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const emotes = currentNode.data.value.trim().split(' ');
  emitter.emit('services::twitch::emotes', 'firework', emotes);
  return true;
}