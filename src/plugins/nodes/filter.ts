import { itemsToEvalPart } from '@sogebot/ui-helpers/queryFilter';
import { VM }  from 'vm2';

import type { Node } from '~/../d.ts/src/plugins';
import { error } from '~/helpers/log';

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const advancedMode = JSON.parse(currentNode.data.data).advancedMode ?? false;

  let script = null;

  if (advancedMode) {
    script = currentNode.data.value;
  } else {
    const filter = currentNode.data.value
      ? JSON.parse(currentNode.data.value) : null;
    if (filter && filter.items.length > 0) {
      script = itemsToEvalPart(filter.items, filter.operator);
    }
  }

  if (!script) {
    return false;
  }
  try {
    const sandbox = {
      sender: userstate ? {
        userName: userstate.userName,
        userId:   userstate.userId,
      } : null,
      parameters,
      ...variables,
    };
    const vm = new VM({ sandbox });
    const result = vm.run(`(function () {  return ${script} })`)();
    return !!result;
  } catch (e) {
    error(`PLUGINS#${pluginId}: ${(e as Error).stack}`);
    return false;
  }
}