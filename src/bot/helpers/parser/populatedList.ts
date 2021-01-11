import { isBotStarted } from '../database';
import { list } from '../register';

const populatedList: any[] = [];

function load () {
  if (!isBotStarted) {
    setTimeout(() => load(), 1000);
    return;
  }
  for (const dir of ['core', 'systems', 'games', 'overlays', 'integrations', 'registries']) {
    for (const system of list(dir)) {
      populatedList.push(system);
    }
  }
}

load();

export { populatedList };