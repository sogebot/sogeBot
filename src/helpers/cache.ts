import type { PermissionCommandsInterface } from '@entity/permissions';
import { PermissionCommands } from '@entity/permissions';
import { getRepository } from 'typeorm';

import { cleanViewersCache } from './permissions';

import { isDbConnected } from '~/helpers/database';
import { debug } from '~/helpers/log';

const cachedCommandsPermissions: PermissionCommandsInterface[] = [];
const refreshCachedCommandPermissions = () => {
  if (!isDbConnected) {
    setTimeout(() => refreshCachedCommandPermissions(), 1000);
    return;
  }
  getRepository(PermissionCommands).find().then(values => {
    while(cachedCommandsPermissions.length){
      cachedCommandsPermissions.shift();
    }
    for (const value of values) {
      debug('parser.command', `Command '${value.name}' permission '${value.permission}' cached.`);
      cachedCommandsPermissions.push(value);
    }
  });
};
refreshCachedCommandPermissions();

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
  addToParserFindCache, parserFindCache, invalidateParserCache, cachedCommandsPermissions, refreshCachedCommandPermissions,
};
