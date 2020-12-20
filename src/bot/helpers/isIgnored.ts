import { globalIgnoreList } from '../data/globalIgnoreList';
import tmi from '../tmi';
import { isBroadcaster } from './isBroadcaster';

export function isIgnored(sender: { username: string | null; userId?: string | number }) {
  if (typeof sender.userId === 'string') {
    sender.userId = Number(sender.userId);
  }
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
  return tmi.ignorelist.map((o) => {
    return typeof o === 'string' ? o.trim().toLowerCase() : o;
  });
}

export function getGlobalIgnoreList() {
  return Object.keys(globalIgnoreList)
    .filter(o => !tmi.globalIgnoreListExclude.map((ex: number | string) => String(ex)).includes(o))
    .map(o => {
      const id = Number(o);
      return { id, ...globalIgnoreList[id as unknown as keyof typeof globalIgnoreList] };
    });
}