import { VM } from 'vm2';

import { template } from '../template';

import type { Node } from '~/../d.ts/src/plugins';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: ChatUser) {
  const variableName = currentNode.data.value;
  const toEval = await template(JSON.parse(currentNode.data.data).value.trim(), { parameters, ...variables });

  const vm = new VM({
    sandbox: {
      parameters, ...variables,
    },
  });
  const value = await vm.run(`(function () { return ${toEval} })`)();
  variables[variableName] = value;
  return true;
}