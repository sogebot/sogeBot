import type { AliasInterface } from '../../database/entity/alias';

const findCache: {
  search: string;
  alias: Readonly<Required<AliasInterface>>;
}[] = [];

function invalidate() {
  while(findCache.length > 0) {
    findCache.shift();
  }
}

export { invalidate, findCache };