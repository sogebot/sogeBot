import type { Commands } from '@entity/commands';

const findCache: {
  search: string;
  commands: {
    command: Commands;
    cmdArray: string[];
  }[]
}[] = [];

function invalidate() {
  while(findCache.length > 0) {
    findCache.shift();
  }
}

export { invalidate, findCache };
