import { itemsToEvalPart } from '@sogebot/ui-helpers/queryFilter';
import { VM }  from 'vm2';

import type { Node } from '~/../d.ts/src/plugins';

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: ChatUser) {
  const filter = currentNode.data.value ? JSON.parse(currentNode.data.value) : null;
  if (filter && filter.items.length > 0) {
    const script = itemsToEvalPart(filter.items, filter.operator);
    const sandbox = {
      sender: {
        userName: userstate.userName,
        userId:   userstate.userId,
      },
      ...parameters,
      ...variables,
    };
    const vm = new VM({ sandbox });
    const result = vm.run(`(function () {  return ${script} })`)();
    return !!result;
  }
  return true;
}