import { cloneDeep } from 'lodash';

let ignorelist: any[] = [];
let globalIgnoreListExclude: any[] = [];

function setIgnoreList(list: any[]) {
  ignorelist = cloneDeep(list);
}

function setGlobalIgnoreListExclude(list: any[]) {
  globalIgnoreListExclude = cloneDeep(list);
}

export { globalIgnoreListExclude, ignorelist, setIgnoreList, setGlobalIgnoreListExclude };