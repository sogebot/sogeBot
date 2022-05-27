import { template } from '../template';

import type { Node } from '~/../d.ts/src/plugins';
import { info } from '~/helpers/log';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  info(`PLUGINS#${pluginId}: ${await template(currentNode.data.value, { parameters, ...variables }, userstate)}`);
  return true;
}