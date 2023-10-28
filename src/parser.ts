import * as constants from '@sogebot/ui-helpers/constants.js';
import { flatMap, sortBy, isFunction, isNil, orderBy } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { getUserSender } from './helpers/commons/index.js';
import { list } from './helpers/register.js';
import getBotId from './helpers/user/getBotId.js';
import getBotUserName from './helpers/user/getBotUserName.js';

import { PermissionCommands } from '~/database/entity/permissions.js';
import { timer } from '~/decorators.js';
import { incrementCountOfCommandUsage } from '~/helpers/commands/count.js';
import {
  debug, error, info, warning,
} from '~/helpers/log.js';
import { parserEmitter } from '~/helpers/parser/emitter.js';
import { check } from '~/helpers/permissions/check.js';
import { getCommandPermission } from '~/helpers/permissions/getCommandPermission.js';
import { translate } from '~/translate.js';

parserEmitter.on('process', async (opts, cb) => {
  cb(await (new Parser(opts)).process());
});

parserEmitter.on('fireAndForget', async (opts) => {
  setImmediate(() => {
    opts.fnc.apply(opts.this, [opts.opts]);
  });
});

export class Parser {
  id = uuid();
  started_at = Date.now();
  message = '';
  isAction = false;
  isHighlight = false;
  isFirstTimeMessage = false;
  sender: CommandOptions['sender'] | null = null;
  discord: CommandOptions['discord'] = undefined;
  emotesOffsets = new Map();
  skip = false;
  quiet = false;
  successfullParserRuns: any[] = [];

  constructor (opts: any = {}) {
    this.message = opts.message || '';
    this.id = opts.id || '';
    this.sender = opts.sender || null;
    this.discord = opts.discord || undefined;
    this.emotesOffsets = opts.emotesOffsets || new Map();
    this.skip = opts.skip || false;
    this.isAction = opts.isAction || false;
    this.isFirstTimeMessage = opts.isFirstTimeMessage || false;
    this.isHighlight = opts.isHighlight || false;
    this.quiet = opts.quiet || false;
    this.successfullParserRuns = [];
  }

  get isCommand() {
    return this.message.startsWith('!');
  }

  time () {
    return Date.now() - this.started_at;
  }

  @timer()
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
      const opts: ParserOptions = {
        isParserOptions:    true,
        id:                 this.id,
        emotesOffsets:      this.emotesOffsets,
        isAction:           this.isAction,
        isHighlight:        this.isHighlight,
        isFirstTimeMessage: this.isFirstTimeMessage,
        sender:             this.sender,
        discord:            this.discord ?? undefined,
        message:            this.message.trim(),
        parameters:         text.trim(),
        skip:               this.skip,
        parser:             this,
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

  @timer()
  async process (): Promise<CommandResponse[]> {
    debug('parser.process', 'PROCESS START of "' + this.message + '"');

    const parsers = await this.parsers();

    const text = this.message.trim().replace(/^(!\w+)/i, '');
    const opts: ParserOptions = {
      isParserOptions:    true,
      id:                 this.id,
      sender:             this.sender,
      discord:            this.discord ?? undefined,
      emotesOffsets:      this.emotesOffsets,
      isAction:           this.isAction,
      isHighlight:        this.isHighlight,
      isFirstTimeMessage: this.isFirstTimeMessage,
      message:            this.message.trim(),
      parameters:         text.trim(),
      skip:               this.skip,
      parser:             this,
    };

    for (const parser of parsers.filter(o => !o.fireAndForget && o.priority !== constants.MODERATION)) {
      if (
        !(this.skip && parser.skippable) // parser is not fully skippable
        && (isNil(this.sender) // if user is null -> we are running command through a bot
          || this.skip
          || (await check(this.sender.userId, parser.permission, false)).access)
      ) {
        debug('parser.process', 'Processing ' + parser.name);

        const time = Date.now();
        const status = await parser.fnc.apply(parser.this, [opts]);
        debug('parser.process', 'Status ' + JSON.stringify({ status }));
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
        debug('parser.time', 'Processed ' + parser.name + ' took ' + ((Date.now() - time) / 1000));
      } else {
        debug('parser.process', 'Skipped ' + parser.name);
      }
    }

    setTimeout(() => {
      // run fire and forget after regular parsers
      for (const parser of parsers.filter(o => o.fireAndForget)) {
        if (this.skip && parser.skippable) {
          debug('parser.process', 'Skipped ' + parser.name);
        } else {
          parserEmitter.emit('fireAndForget', {
            this: parser.this,
            fnc:  parser.fnc,
            opts,
          });
        }
      }
    }, 0);

    if (this.isCommand) {
      const output = this.command(this.sender, this.message.trim());
      return output;
    }
    return [];
  }

  /**
   * Return all parsers
   * @constructor
   * @returns object or empty list
   */
  @timer()
  async parsers () {
    let parsers: any[] = [];
    for (let i = 0, length = list().length; i < length; i++) {
      if (isFunction(list()[i].parsers)) {
        parsers.push(list()[i].parsers());
      }
    }
    parsers = orderBy(flatMap(await Promise.all(parsers)), 'priority', 'asc');
    return parsers;
  }

  /**
   * Return all rollbacks
   * @constructor
   * @returns object or empty list
   */
  @timer()
  async rollbacks () {
    const rollbacks: any[] = [];
    for (let i = 0, length = list().length; i < length; i++) {
      if (isFunction(list()[i].rollbacks)) {
        rollbacks.push(list()[i].rollbacks());
      }
    }
    return flatMap(await Promise.all(rollbacks));
  }

  /**
   * Find first command called by message
   * @constructor
   * @param {string} message - Message from chat
   * @param {string[] | null} cmdlist - Set of commands to check, if null all registered commands are checked
   * @returns object or null if empty
   */
  @timer()
  async find (message: string, cmdlist: {
    this: any; fnc: (opts: CommandOptions) => CommandResponse[]; command: string; id: string; permission: string | null; _fncName: string;
  }[] | null = null) {
    debug('parser.find', JSON.stringify({ message, cmdlist }));

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
        return item;
      }
    }
    return null;
  }

  @timer()
  async getCommandsList () {
    let commands: any[] = [];
    for (let i = 0, length = list().length; i < length; i++) {
      if (isFunction(list()[i].commands)) {
        commands.push(list()[i].commands());
      }
    }
    commands = sortBy(flatMap(await Promise.all(commands)), (o => -o.command.length));
    for (const command of commands) {
      const permission = await PermissionCommands.findOneBy({ name: command.id });
      if (permission) {
        command.permission = permission.permission; // change to custom permission
        debug('parser.command', `Checking permission for ${command.id} - custom ${permission.name}`);
      } else {
        debug('parser.command', `Checking permission for ${command.id} - original`);
      }
    }
    return commands;
  }

  @timer()
  async command (sender: CommandOptions['sender'] | null, message: string, disablePermissionCheck = false): Promise<CommandResponse[]> {
    debug('parser.command', { sender, message });
    if (!message.startsWith('!')) {
      return [];
    } // do nothing, this is not a command or user is ignored
    const command = await this.find(message, null);
    debug('parser.command', { command });
    if (isNil(command)) {
      return [];
    } // command not found, do nothing
    if (command.permission === null) {
      warning(`Command ${command.command} is disabled!`);
      return [];
    } // command is disabled

    if (
      isNil(this.sender) // if user is null -> we are running command through a bot
      || disablePermissionCheck
      || this.skip
      || (await check(this.sender.userId, command.permission, false)).access
    ) {
      const text = message.trim().replace(new RegExp('^(' + command.command + ')', 'i'), '').trim();
      const opts: CommandOptions = {
        sender:             sender || getUserSender(getBotId(), getBotUserName()),
        discord:            this.discord ?? undefined,
        emotesOffsets:      this.emotesOffsets,
        isAction:           this.isAction,
        isHighlight:        this.isHighlight,
        isFirstTimeMessage: this.isFirstTimeMessage,
        command:            command.command,
        parameters:         text.trim(),
        createdAt:          this.started_at,
        attr:               {
          skip:  this.skip,
          quiet: this.quiet,
        },
      };

      if (isNil(command.id)) {
        throw Error(`command id is missing from ${command.fnc}`);
      }

      if (typeof command.fnc === 'function' && !isNil(command.id)) {
        incrementCountOfCommandUsage(command.command);
        debug('parser.command', 'Running ' + command.command);
        const responses = command.fnc.apply(command.this, [opts]) as CommandResponse[];
        return responses;
      } else {
        error(command.command + ' have wrong undefined function ' + command._fncName + '() registered!');
        return [];
      }
    } else {
      info(`User ${this.sender.userName}#${this.sender.userId} doesn't have permissions to use ${command.command}`);
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
        return[{
          response: translate('permissions.without-permission').replace(/\$command/g, message), sender, attr: { isWhisper: true }, discord: this.discord,
        }];
      }
      return [];
    }
  }
}