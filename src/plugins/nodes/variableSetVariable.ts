import { runScript } from '../../helpers/customvariables';

import type { Node } from '~/../d.ts/src/plugins';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const variableName = currentNode.data.value;

  const toEval = JSON.parse(currentNode.data.data).value.trim();
  const returnedValue = await runScript(toEval, {
    variables,
    parameters,
    sender: userstate ? {
      userName: userstate.userName, userId: userstate.userId, source: 'twitch',
    } : null,
    isUI:     false,
    _current: undefined,
  });
  variables[variableName] = returnedValue;
  return true;
}