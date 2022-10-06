import { VM }  from 'vm2';

import type { Node } from '~/../d.ts/src/plugins';
import { error } from '~/helpers/log';

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const script = currentNode.data.value;
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

    const result = vm.run(`(function () { ${script} })`)();
    return !!result;
  } catch (e) {
    error(`PLUGINS#${pluginId}: ${(e as Error).stack}`);
    return false;
  }
}