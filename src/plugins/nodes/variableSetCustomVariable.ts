import { setValueOf } from '../../helpers/customvariables';
import { template } from '../template';

import type { Node } from '~/../d.ts/src/plugins';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const variableName = currentNode.data.value;
  const value = await template(JSON.parse(currentNode.data.data).value, { parameters, ...variables });
  await setValueOf(String(variableName), value, {});
  return true;
}