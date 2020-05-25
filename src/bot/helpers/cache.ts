import type { PermissionCommandsInterface } from '../database/entity/permissions';

import { getRepository } from 'typeorm';
import { PermissionCommands } from '../database/entity/permissions';

import { debug } from './log';
import { isDbConnected } from './database';

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
};
const addToParserFindCache = (hash: string, command: { this: any; fnc: (opts: CommandOptions) => CommandResponse[]; command: string; id: string; permission: string | null; _fncName: string } | null) => {
  parserFindCache.push({ hash, command });
};

export { addToParserFindCache, parserFindCache, invalidateParserCache, cachedCommandsPermissions, refreshCachedCommandPermissions };
