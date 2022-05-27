import type { Node } from '~/../d.ts/src/plugins';
import { PluginVariable } from '~/database/entity/plugins';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const variableName = currentNode.data.value;
  const variable = new PluginVariable();
  variable.variableName = variableName;
  variable.pluginId = pluginId;
  variable.value = JSON.stringify(variables[variableName]);
  await variable.save();
  return true;
}