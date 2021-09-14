import { cloneDeep } from 'lodash';

let _ignorelist: any[] = [];
let _globalIgnoreListExclude: any[] = [];

const isIgnoredCache = new Map<string, boolean>();

const ignorelist = {
  set value(value: typeof _ignorelist) {
    _ignorelist = cloneDeep(value);
    isIgnoredCache.clear();
  },
  get value() {
    return _ignorelist;
  },
};

const globalIgnoreListExclude = {
  set value(value: typeof _globalIgnoreListExclude) {
    _globalIgnoreListExclude = cloneDeep(value);
    isIgnoredCache.clear();
  },
  get value() {
    return _globalIgnoreListExclude;
  },
};
export {
  globalIgnoreListExclude, ignorelist, isIgnoredCache, 
};