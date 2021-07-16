import { readFileSync } from 'fs';

import { globalIgnoreListExclude, ignorelist } from '../tmi/ignoreList';
import { isBroadcaster } from './isBroadcaster';

const globalIgnoreList = JSON.parse(readFileSync('./assets/globalIgnoreList.json', 'utf8'));

export function isIgnored(sender: { username: string | null; userId?: string }) {
  if (sender.username === null) {
    return false; // null can be bot from dashboard or event
  }

  const isInIgnoreList = getIgnoreList().includes(sender.username) || getIgnoreList().includes(sender.userId);
  const isInGlobalIgnoreList = typeof getGlobalIgnoreList().find(data => {
    return data.id === sender.userId || data.known_aliases.includes((sender.username || '').toLowerCase());
  }) !== 'undefined';
  return (isInGlobalIgnoreList || isInIgnoreList) && !isBroadcaster(sender);
}

export function getIgnoreList() {
  return ignorelist.value.map((o) => {
    return typeof o === 'string' ? o.trim().toLowerCase() : o;
  });
}

export function getGlobalIgnoreList() {
  return Object.keys(globalIgnoreList)
    .filter(o => !globalIgnoreListExclude.value.map((ex: number | string) => String(ex)).includes(o))
    .map(id => {
      return { id, ...globalIgnoreList[id as unknown as keyof typeof globalIgnoreList] };
    });
}