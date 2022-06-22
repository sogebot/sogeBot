import type { Alias } from '@entity/alias';

const findCache: {
  search: string;
  alias: Readonly<Required<Alias>>;
}[] = [];

function invalidate() {
  while(findCache.length > 0) {
    findCache.shift();
  }
}

export { invalidate, findCache };
