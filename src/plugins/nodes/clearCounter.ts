import { clearCounter } from './gateCounter';

import type { Node } from '~/../d.ts/src/plugins';
import { Plugin } from '~/database/entity/plugins';

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  try {
    const plugin = await Plugin.findOneOrFail({ id: pluginId });
    const workflow = Object.values(
      JSON.parse(plugin.workflow).drawflow.Home.data
    ) as Node[];

    const output = 'output_1';

    if (currentNode.outputs[output]) {
      const nodes = currentNode.outputs[output].connections.map((item) => workflow.find(wItem => wItem.id === Number(item.node)));
      for (const node of nodes) {
        if (!node) {
          continue;
        }

        if (node.name === 'gateCounter') {
          const uuid = JSON.parse(node.data.data).uuid;
          clearCounter(uuid);
        }
      }
    }
  } catch (e) {
    // noop
  }
  // always return false as it doesn't continue to next
  return false;
}