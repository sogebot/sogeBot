import { template } from '../template';

import type { Node } from '~/../d.ts/src/plugins';
import { error, warning } from '~/helpers/log';

const counter = new Map<string, number>();

export const clearCounter = (uuid: string) => {
  for (const key of counter.keys()) {
    if (key.includes(uuid)) {
      counter.delete(key);
    }
  }
};

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const perUser = JSON.parse(currentNode.data.data).perUser ?? false;
  const resetAfterTrigger = JSON.parse(currentNode.data.data).resetAfterTrigger ?? false;
  const uuid = JSON.parse(currentNode.data.data).uuid;

  try {
    if (!uuid) {
      throw new Error('Missing counter uuid, this shouldn\'t happen. Please recreate affected node.');
    }

    let expectedCount = Number(await template(currentNode.data.value, { parameters, ...variables }));
    if (isNaN(expectedCount)) {
      warning(`PLUGINS#${pluginId}: Counter value is not a number! Got: ${expectedCount}, defaulting to 10`);
      expectedCount = 10;
    }

    const key = perUser ? `${userstate!.userId}|${uuid}` : uuid;

    const count = (counter.get(key) ?? 0) + 1;
    counter.set(key, count);

    if (count <= expectedCount) {
      throw new Error(`Counter`);
    }

    if (resetAfterTrigger) {
      counter.set(key, 0);
    }

    return true;
  } catch (e) {
    if (e instanceof Error) {
      if (!e.message.startsWith('Counter')) {
        error(`PLUGINS#${pluginId}: ${(e as Error).stack}`);
      }
    }
    return false;
  }
}