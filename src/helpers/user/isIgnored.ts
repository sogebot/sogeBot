import { readFileSync } from 'fs';

import { HOUR } from '@sogebot/ui-helpers/constants';
import { cloneDeep, isEqual } from 'lodash';
import fetch from 'node-fetch';

import { info } from '../log';
import { globalIgnoreListExclude, ignorelist } from '../tmi/ignoreList';
import { isBroadcaster } from './isBroadcaster';

let globalIgnoreList = JSON.parse(readFileSync('./assets/globalIgnoreList.json', 'utf8'));

export function isInGlobalIgnoreList (sender: { username: string | null; userId?: string }) {
  return typeof getGlobalIgnoreList().find(data => {
    return data.id === sender.userId || data.known_aliases.includes((sender.username || '').toLowerCase());
  }) !== 'undefined';
}

export function isIgnored(sender: { username: string | null; userId?: string }) {
  if (sender.username === null) {
    return false; // null can be bot from dashboard or event
  }

  const isInIgnoreList = getIgnoreList().includes(sender.username) || getIgnoreList().includes(sender.userId);

  return (isInGlobalIgnoreList(sender) || isInIgnoreList) && !isBroadcaster(sender);
}

export function getIgnoreList() {
  return ignorelist.value.map((o) => {
    return typeof o === 'string' ? o.trim().toLowerCase() : o;
  });
}

setInterval(() => {
  update();
}, HOUR);

const update = async () => {
  const response = await fetch(`https://raw.githubusercontent.com/sogehige/sogeBot/master/assets/globalIgnoreList.json`);

  if (response.ok) {
    const data = await response.json();
    if (!isEqual(data, globalIgnoreList)) {
      globalIgnoreList = cloneDeep(data);
      info('IGNORELIST: updated ignorelist from github');
    }
  }
};
update();

export function getGlobalIgnoreList() {
  return Object.keys(globalIgnoreList)
    .filter(o => !globalIgnoreListExclude.value.map((ex: number | string) => String(ex)).includes(o))
    .map(id => {
      return { id, ...globalIgnoreList[id as unknown as keyof typeof globalIgnoreList] };
    });
}