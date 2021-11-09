import { isBotStarted } from '../database';
import { list } from '../register';

const populatedList: any[] = [];

function load () {
  if (!isBotStarted) {
    setImmediate(() => load());
    return;
  }
  for (const dir of ['core', 'systems', 'games', 'overlays', 'integrations', 'registries', 'services']) {
    for (const system of list(dir)) {
      populatedList.push(system);
    }
  }
}

load();

export { populatedList };