import crypto from 'crypto';

import _ from 'lodash';
import { v4 as uuid } from 'uuid';

import * as constants from './constants';
import {
  addToParserFindCache, cachedCommandsPermissions, parserFindCache,
} from './helpers/cache';
import { incrementCountOfCommandUsage } from './helpers/commands/count';
import { getBotSender } from './helpers/commons';
import {
  debug, error, warning,
} from './helpers/log';
import { parserEmitter } from './helpers/parser/';
import { populatedList } from './helpers/parser/populatedList';
import {
  addToViewersCache, getCommandPermission, getFromViewersCache,
} from './helpers/permissions';
import { check } from './helpers/permissions/';
import { translate } from './translate';

parserEmitter.on('process', async (opts, cb) => {
  cb(await (new Parser(opts)).process());
});

class Parser {
  id = uuid();
  started_at = Date.now();
  message = '';
  sender: CommandOptions['sender'] | null = null;
  skip = false;
  quiet = false;
  successfullParserRuns: any[] = [];

  constructor (opts: any = {}) {
    this.message = opts.message || '';
    this.sender = opts.sender || null;
    this.skip = opts.skip || false;
    this.quiet = opts.quiet || false;
    this.successfullParserRuns = [];
  }

  get isCommand() {
    return this.message.startsWith('!');
  }

  time () {
    return Date.now() - this.started_at;
  }

  async isModerated () {
    debug('parser.process', 'ISMODERATED START of "' + this.message + '"');
    if (this.skip) {
      return false;
    }

    const parsers = await this.parsers();
    for (const parser of parsers) {
      const time = Date.now();
      if (parser.priority !== constants.MODERATION) {
        continue;
      } // skip non-moderation parsers
      debug('parser.process', 'Processing ' + parser.name);
      const text = this.message.trim().replace(/^(!\w+)/i, '');
      const opts = {
        sender:     this.sender,
        message:    this.message.trim(),
        parameters: text.trim(),
        skip:       this.skip,
      };
      const isOk = await parser.fnc.apply(parser.this, [opts]);

      debug('parser.time', 'Processed ' + parser.name + ' took ' + ((Date.now() - time) / 1000));
      if (!isOk) {
        debug('parser.process', 'Moderation failed ' + parser.name);
        return true;
      }
    }
    return false; // no parser failed
  }

  async process (): Promise<CommandResponse[]> {
    debug('parser.process', 'PROCESS START of "' + this.message + '"');

    const parsers = await this.parsers();
    for (const parser of parsers) {
      if (parser.priority === constants.MODERATION) {
        continue;
      } // skip moderation parsers

      if (this.sender) {
        const permissionCheckTime = Date.now();
        if (typeof getFromViewersCache(this.sender.userId, parser.permission) === 'undefined') {
          debug('parser.permission', `Permission not cached for ${this.sender.username}#${this.sender.userId} | ${parser.permission}`);
          addToViewersCache(this.sender.userId, parser.permission, (await check(Number(this.sender.userId), parser.permission, false)).access);
          debug('parser.time', `Permission check for ${this.sender.username}#${this.sender.userId} | ${parser.permission} took ${(Date.now() - permissionCheckTime) / 1000}`);
        } else {
          debug('parser.permission', `Permission cached for ${this.sender.username}#${this.sender.userId} | ${parser.permission}`);
        }
      }

      if (
        !(this.skip && parser.skippable) // parser is not fully skippable
        && (_.isNil(this.sender) // if user is null -> we are running command through a bot
          || this.skip
          || getFromViewersCache(this.sender.userId, parser.permission))
      ) {
        debug('parser.process', 'Processing ' + parser.name + ' (fireAndForget: ' + parser.fireAndForget + ')');
        const text = this.message.trim().replace(/^(!\w+)/i, '');
        const opts = {
          id:         this.id,
          sender:     this.sender,
          message:    this.message.trim(),
          parameters: text.trim(),
          skip:       this.skip,
        };

        const time = Date.now();
        if (parser.fireAndForget) {
          parser.fnc.apply(parser.this, [opts]);
        } else {
          const status = await parser.fnc.apply(parser.this, [opts]);
          if (!status) {
            const rollbacks = await this.rollbacks();
            for (const r of rollbacks) {
              // rollback is needed (parser ran successfully)
              if (this.successfullParserRuns.find((o) => {
                const parserSystem = o.name.split('.')[0];
                const rollbackSystem = r.name.split('.')[0];
                return parserSystem === rollbackSystem;
              })) {
                debug('parser.process', 'Rollbacking ' + r.name);
                await r.fnc.apply(r.this, [opts]);
              } else {
                debug('parser.process', 'Rollback skipped for ' + r.name);
              }
            }
            return [];
          } else {
            this.successfullParserRuns.push({ name: parser.name, opts }); // need to save opts for permission rollback
          }
        }
        debug('parser.time', 'Processed ' + parser.name + ' (fireAndForget: ' + parser.fireAndForget + ') took ' + ((Date.now() - time) / 1000));
      } else {
        debug('parser.process', 'Skipped ' + parser.name + ' (fireAndForget: ' + parser.fireAndForget + ')');
      }
    }

    if (this.isCommand) {
      return this.command(this.sender, this.message.trim());
    }
    return [];
  }

  /**
   * Return all parsers
   * @constructor
   * @returns object or empty list
   */
  async parsers () {
    let parsers: any[] = [];
    for (let i = 0, length = populatedList.length; i < length; i++) {
      if (_.isFunction(populatedList[i].parsers)) {
        parsers.push(populatedList[i].parsers());
      }
    }
    parsers = _.orderBy(_.flatMap(await Promise.all(parsers)), 'priority', 'asc');
    return parsers;
  }

  /**
   * Return all rollbacks
   * @constructor
   * @returns object or empty list
   */
  async rollbacks () {
    const rollbacks: any[] = [];
    for (let i = 0, length = populatedList.length; i < length; i++) {
      if (_.isFunction(populatedList[i].rollbacks)) {
        rollbacks.push(populatedList[i].rollbacks());
      }
    }
    return _.flatMap(await Promise.all(rollbacks));
  }

  /**
   * Find first command called by message
   * @constructor
   * @param {string} message - Message from chat
   * @param {string[] | null} cmdlist - Set of commands to check, if null all registered commands are checked
   * @returns object or null if empty
   */
  async find (message: string, cmdlist: {
    this: any; fnc: (opts: CommandOptions) => CommandResponse[]; command: string; id: string; permission: string | null; _fncName: string;
  }[] | null = null) {
    debug('parser.find', JSON.stringify({ message, cmdlist }));

    const hash = crypto.createHash('sha1').update(JSON.stringify({ message, cmdlist })).digest('hex');
    const cache = parserFindCache.find(o => o.hash === hash);
    if (cache) {
      return cache.command;
    } else {
      if (cmdlist === null) {
        cmdlist = await this.getCommandsList();
      }
      for (const item of cmdlist) {
        const onlyParams = message.trim().toLowerCase().replace(item.command, '');
        const isStartingWith = message.trim().toLowerCase().startsWith(item.command);

        debug('parser.find', JSON.stringify({ command: item.command, isStartingWith }));

        if (isStartingWith && (onlyParams.length === 0 || (onlyParams.length > 0 && onlyParams[0] === ' '))) {
          const customPermission = await getCommandPermission(item.id);
          if (typeof customPermission !== 'undefined') {
            item.permission = customPermission;
          }
          addToParserFindCache(hash, item);
          return item;
        }
      }
      addToParserFindCache(hash, null);
      return null;
    }
  }

  async getCommandsList () {
    let commands: any[] = [];
    for (let i = 0, length = populatedList.length; i < length; i++) {
      if (_.isFunction(populatedList[i].commands)) {
        commands.push(populatedList[i].commands());
      }
    }
    commands = _(await Promise.all(commands)).flatMap().sortBy(o => -o.command.length).value();
    for (const command of commands) {
      const permission = cachedCommandsPermissions.find(cachedPermission => cachedPermission.id === command.id);
      if (permission) {
        command.permission = permission.permission; // change to custom permission
        debug('parser.command', `Checking permission for ${command.id} - custom ${permission.name}`);
      } else {
        debug('parser.command', `Checking permission for ${command.id} - original`);
      }
    }
    return commands;
  }

  async command (sender: CommandOptions['sender'] | null, message: string, disablePermissionCheck = false): Promise<CommandResponse[]> {
    debug('parser.command', { sender, message });
    if (!message.startsWith('!')) {
      return [];
    } // do nothing, this is not a command or user is ignored
    const command = await this.find(message, null);
    debug('parser.command', { command });
    if (_.isNil(command)) {
      return [];
    } // command not found, do nothing
    if (command.permission === null) {
      warning(`Command ${command.command} is disabled!`);
      return [];
    } // command is disabled

    if (this.sender && !disablePermissionCheck) {
      if (typeof getFromViewersCache(this.sender.userId, command.permission) === 'undefined') {
        addToViewersCache(this.sender.userId, command.permission, (await check(Number(this.sender.userId), command.permission, false)).access);
      }
    }

    if (
      _.isNil(this.sender) // if user is null -> we are running command through a bot
      || disablePermissionCheck
      || this.skip
      || getFromViewersCache(this.sender.userId, command.permission)
    ) {
      const text = message.trim().replace(new RegExp('^(' + command.command + ')', 'i'), '').trim();
      const opts: CommandOptions = {
        sender:     sender || getBotSender(),
        command:    command.command,
        parameters: text.trim(),
        createdAt:  this.started_at,
        attr:       {
          skip:  this.skip,
          quiet: this.quiet,
        },
      };

      if (_.isNil(command.id)) {
        throw Error(`command id is missing from ${command.fnc}`);
      }

      if (typeof command.fnc === 'function' && !_.isNil(command.id)) {
        incrementCountOfCommandUsage(command.command);
        debug('parser.command', 'Running ' + command.command);
        const responses = command.fnc.apply(command.this, [opts]) as CommandResponse[];
        return responses;
      } else {
        error(command.command + ' have wrong undefined function ' + command._fncName + '() registered!');
        return [];
      }
    } else {
      // do all rollbacks when permission failed
      const rollbacks = await this.rollbacks();
      for (const r of rollbacks) {
        const runnedRollback = this.successfullParserRuns.find((o) => {
          const parserSystem = o.name.split('.')[0];
          const rollbackSystem = r.name.split('.')[0];
          return parserSystem === rollbackSystem;
        });
        if (runnedRollback) {
          debug('parser.process', 'Rollbacking ' + r.name);
          await r.fnc.apply(r.this, [runnedRollback.opts]);
        } else {
          debug('parser.process', 'Rollback skipped for ' + r.name);
        }
      }

      // user doesn't have permissions for command
      if (sender) {
        sender['message-type'] = 'whisper';
        return[{
          response: translate('permissions.without-permission').replace(/\$command/g, message), sender, attr: {},
        }];
      }
      return [];
    }
  }
}

export default Parser;
export { Parser };