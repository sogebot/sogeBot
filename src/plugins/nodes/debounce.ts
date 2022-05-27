import { template } from '../template';

import type { Node } from '~/../d.ts/src/plugins';
import { error, warning } from '~/helpers/log';

const debounce = new Map<string, number>();
const intervals = new Map<string, number>();

setInterval(() => {
  // cleanup intervals
  for (const [key, value] of debounce.entries()) {
    const interval = intervals.get(key);
    if (interval && Date.now() - value > interval) {
      debounce.delete(key);
    }
  }
}, 10000);

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  const perUser = JSON.parse(currentNode.data.data).perUser ?? false;
  const uuid = JSON.parse(currentNode.data.data).uuid;

  try {
    if (!uuid) {
      throw new Error('Missing debounce uuid, this shouldn\'t happen. Please recreate affected node.');
    }

    let miliseconds = Number(await template(currentNode.data.value, { parameters, ...variables }));
    if (isNaN(miliseconds)) {
      warning(`PLUGINS#${pluginId}: Debounce value is not a number! Got: ${miliseconds}, defaulting to 1000`);
      miliseconds = 1000;
    }

    const key = perUser ? `${userstate!.userId}|${uuid}` : uuid;
    intervals.set(uuid, miliseconds);

    const timestamp = debounce.get(key);
    if (!timestamp || timestamp + miliseconds < Date.now()) {
      debounce.set(key, Date.now());
    } else {
      throw new Error(`Debouncing - ${(Math.abs(Date.now() - timestamp - miliseconds) / 1000).toFixed(2)}s`);
    }

    return true;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.startsWith('Debouncing')) {
        warning(`PLUGINS#${pluginId}: ${(e as Error).message}`);
      } else {
        error(`PLUGINS#${pluginId}: ${(e as Error).stack}`);
      }
    }
    return false;
  }
}