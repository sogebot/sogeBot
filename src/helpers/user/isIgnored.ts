import { readFileSync } from 'fs';

import { HOUR } from '@sogebot/ui-helpers/constants.js';
import { cloneDeep, isEqual } from 'lodash-es';
import fetch from 'node-fetch';

import { isBroadcaster } from './isBroadcaster.js';
import { timer } from '../../decorators.js';
import { info } from '../log.js';
import {
  ignorelist, isIgnoredCache,
} from '../tmi/ignoreList.js';

let globalIgnoreList = JSON.parse(readFileSync('./assets/globalIgnoreList.json', 'utf8'));

class HelpersUserIsIgnored {
  @timer()
  isIgnored(sender: { userName: string | null; userId?: string }) {
    if (sender.userName === null) {
      return false; // null can be bot from dashboard or event
    }

    if (sender.userId && isIgnoredCache.has(sender.userId)) {
      return isIgnoredCache.get(sender.userId);
    }

    if (isIgnoredCache.has(sender.userName)) {
      return isIgnoredCache.get(sender.userName);
    }

    const isInIgnoreList = getIgnoreList().includes(sender.userName) || getIgnoreList().includes(sender.userId);
    const isIgnoredCheck = (isInGlobalIgnoreList(sender) || isInIgnoreList) && !isBroadcaster(sender);

    if (sender.userId) {
      isIgnoredCache.set(sender.userId, isIgnoredCheck);
    }
    isIgnoredCache.set(sender.userName, isIgnoredCheck);
    return isIgnoredCheck;
  }
}
const cl = new HelpersUserIsIgnored();

export function isInGlobalIgnoreList (sender: { userName: string | null; userId?: string }) {
  return typeof getGlobalIgnoreList().find(data => {
    return data.id === sender.userId || data.known_aliases.includes((sender.userName || '').toLowerCase());
  }) !== 'undefined';
}

export function isIgnoredSafe(sender: { userName: string | null; userId?: string }) {
  const found = getGlobalIgnoreList().find(data => {
    return data.id === sender.userId || data.known_aliases.includes((sender.userName || '').toLowerCase());
  });

  return found ? !!found.safe : false;
}

export function isIgnored(sender: { userName: string | null; userId?: string }) {
  return cl.isIgnored(sender);
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
      isIgnoredCache.clear();
    }
  }
};
update();

export function getGlobalIgnoreList() {
  return Object.keys(globalIgnoreList)
    .map(id => {
      return { id, ...globalIgnoreList[id as unknown as keyof typeof globalIgnoreList] };
    });
}