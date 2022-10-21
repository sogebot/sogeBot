import { cleanViewersCache } from './permissions';

const parserFindCache: {
  hash: string;
  command: {
    this: any; fnc: (opts: CommandOptions) => CommandResponse[]; command: string; id: string; permission: string | null; _fncName: string;
  } | null;
}[] = [];
const invalidateParserCache = () => {
  while(parserFindCache.length) {
    parserFindCache.shift();
  }
  cleanViewersCache();
};
const addToParserFindCache = (hash: string, command: { this: any; fnc: (opts: CommandOptions) => CommandResponse[]; command: string; id: string; permission: string | null; _fncName: string } | null) => {
  parserFindCache.push({ hash, command });
};

export {
  addToParserFindCache, parserFindCache, invalidateParserCache,
};
