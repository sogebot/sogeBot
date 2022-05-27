import { setTimeout } from 'timers/promises';

import { template } from '../../plugins/template';

import type { Node } from '~/../d.ts/src/plugins';
import { warning } from '~/helpers/log';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  let miliseconds = await template(currentNode.data.value, { parameters, ...variables });
  if (isNaN(Number(miliseconds))) {
    warning(`PLUGINS#${pluginId}: Idling value is not a number! Got: ${miliseconds}, defaulting to 1000`);
    miliseconds = '1000';
  }
  await setTimeout(Number(miliseconds));
  return true;
}