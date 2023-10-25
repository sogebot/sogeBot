import { cloneDeep } from 'lodash-es';

let _ignorelist: any[] = [];

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
export {
  ignorelist, isIgnoredCache,
};