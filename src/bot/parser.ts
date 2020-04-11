import _ from 'lodash';
import * as constants from './constants';
import { sendMessage } from './commons';
import { debug, error, warning } from './helpers/log';
import { incrementCountOfCommandUsage } from './helpers/commands/count';
import { getRepository } from 'typeorm';
import { PermissionCommands } from './database/entity/permissions';
import { addToViewersCache, getFromViewersCache } from './helpers/permissions';
import permissions from './permissions';
import events from './events';
import users from './users';
import twitch from './twitch';
import { translate } from './translate';
import currency from './currency';
import general from './general';
import tmi from './tmi';
import { UserStateTags } from 'twitch-js';
import { list } from './helpers/register';

class Parser {
  started_at = Date.now();
  message = '';
  sender: Partial<UserStateTags> | null = null;
  skip = false;
  quiet = false;
  successfullParserRuns: any[] = [];
  isCommand = false;
  list: any = [];

  constructor (opts: any = {}) {
    this.message = opts.message || '';
    this.sender = opts.sender || null;
    this.skip = opts.skip || false;
    this.quiet = opts.quiet || false;
    this.successfullParserRuns = [];

    this.isCommand = this.message.startsWith('!');
    this.list = this.populateList();
  }

  time () {
    return Date.now() - this.started_at;
  }

  async isModerated () {
    debug('parser.process', 'ISMODERATED START of "' + this.message + '"');
    if (this.skip) {
      return false;
    };

    const parsers = await this.parsers();
    for (const parser of parsers) {
      const time = Date.now();
      if (parser.priority !== constants.MODERATION) {
        continue;
      }; // skip non-moderation parsers
      debug('parser.process', 'Processing ' + parser.name);
      const text = this.message.trim().replace(/^(!\w+)/i, '');
      const opts = {
        sender: this.sender,
        message: this.message.trim(),
        parameters: text.trim(),
        skip: this.skip,
      };
      const isOk = await parser.fnc.apply(parser.this, [opts]);

      debug('parser.time', 'Processed ' + parser.name + ' took ' + ((Date.now() - time) / 1000));
      if (!isOk) {
        debug('parser.process', 'Moderation failed ' + JSON.stringify(parser.fnc));
        return true;
      }
    }
    return false; // no parser failed
  }

  async process () {
    debug('parser.process', 'PROCESS START of "' + this.message + '"');

    const parsers = await this.parsers();
    for (const parser of parsers) {
      if (parser.priority === constants.MODERATION) {
        continue;
      }; // skip moderation parsers

      if (this.sender) {
        const permissionCheckTime = Date.now();
        if (typeof getFromViewersCache(this.sender.userId, parser.permission) === 'undefined') {
          debug('parser.permission', `Permission not cached for ${this.sender.username}#${this.sender.userId} | ${parser.permission}`);
          addToViewersCache(this.sender.userId, parser.permission, (await permissions.check(this.sender.userId, parser.permission, false)).access);
          debug('parser.time', `Permission check for ${this.sender.username}#${this.sender.userId} | ${parser.permission} took ${(Date.now() - permissionCheckTime) / 1000}`);
        } else {
          debug('parser.permission', `Permission cached for ${this.sender.username}#${this.sender.userId} | ${parser.permission}`);
        }
      }
      if (
        _.isNil(this.sender) // if user is null -> we are running command through a bot
        || this.skip
        || getFromViewersCache(this.sender.userId, parser.permission)
      ) {
        debug('parser.process', 'Processing ' + parser.name + ' (fireAndForget: ' + parser.fireAndForget + ')');
        const text = this.message.trim().replace(/^(!\w+)/i, '');
        const opts = {
          sender: this.sender,
          message: this.message.trim(),
          parameters: text.trim(),
          skip: this.skip,
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
            return false;
          } else {
            this.successfullParserRuns.push({name: parser.name, opts }); // need to save opts for permission rollback
          }
        }
        debug('parser.time', 'Processed ' + parser.name + ' (fireAndForget: ' + parser.fireAndForget + ') took ' + ((Date.now() - time) / 1000));
      } else {
        debug('parser.process', 'Skipped ' + parser.name + ' (fireAndForget: ' + parser.fireAndForget + ')');
      }
    }
    if (this.isCommand) {
      this.command(this.sender, this.message.trim()).then(responses => {
        if (responses) {
          for (let i = 0; i < responses.length; i++) {
            setTimeout(() => {
              sendMessage(responses[i].response, responses[i].sender, responses[i].attr);
            }, 500 * i);
          }
        }
      });
    }
  }

  populateList () {
    const populatedList: any = [
      currency,
      events,
      users,
      permissions,
      twitch,
      general,
      tmi,
    ];
    for (const dir of ['systems', 'games', 'overlays', 'integrations', 'registries']) {
      for (const system of list(dir)) {
        populatedList.push(system);
      }
    }
    return populatedList;
  }

  /**
   * Return all parsers
   * @constructor
   * @returns object or empty list
   */
  async parsers () {
    let parsers: any[] = [];
    for (let i = 0, length = this.list.length; i < length; i++) {
      if (_.isFunction(this.list[i].parsers)) {
        parsers.push(this.list[i].parsers());
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
    for (let i = 0, length = this.list.length; i < length; i++) {
      if (_.isFunction(this.list[i].rollbacks)) {
        rollbacks.push(this.list[i].rollbacks());
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
  async find (message, cmdlist: {
    this: any; fnc: Function; command: string; id: string; permission: string | null; _fncName: string;
  }[] | null = null) {
    debug('parser.find', JSON.stringify({message, cmdlist}));
    if (cmdlist === null) {
      cmdlist = await this.getCommandsList();
    }
    for (const item of cmdlist) {
      const onlyParams = message.trim().toLowerCase().replace(item.command, '');
      const isStartingWith = message.trim().toLowerCase().startsWith(item.command);

      debug('parser.find', JSON.stringify({command: item.command, isStartingWith}));

      if (isStartingWith && (onlyParams.length === 0 || (onlyParams.length > 0 && onlyParams[0] === ' '))) {
        const customPermission = await permissions.getCommandPermission(item.id);
        if (typeof customPermission !== 'undefined') {
          item.permission = customPermission;
        }
        return item;
      }
    }
    return null;
  }

  async getCommandsList () {
    let commands: any[] = [];
    for (let i = 0, length = this.list.length; i < length; i++) {
      if (_.isFunction(this.list[i].commands)) {
        commands.push(this.list[i].commands());
      }
    }
    commands = _(await Promise.all(commands)).flatMap().sortBy(o => -o.command.length).value();
    for (const command of commands) {
      const permission = await getRepository(PermissionCommands).findOne({ name: command.id });
      if (permission) {
        command.permission = permission.permission;
      }; // change to custom permission
    }
    return commands;
  }

  async command (sender, message) {
    debug('parser.command', { sender, message });
    if (!message.startsWith('!')) {
      return;
    }; // do nothing, this is not a command or user is ignored
    const command = await this.find(message, null);
    debug('parser.command', { command });
    if (_.isNil(command)) {
      return;
    }; // command not found, do nothing
    if (command.permission === null) {
      warning(`Command ${command.command} is disabled!`);
      return;
    }; // command is disabled

    if (this.sender) {
      if (typeof getFromViewersCache(this.sender.userId, command.permission) === 'undefined') {
        addToViewersCache(this.sender.userId, command.permission, (await permissions.check(this.sender.userId, command.permission, false)).access);
      }
    }

    if (
      _.isNil(this.sender) // if user is null -> we are running command through a bot
      || this.skip
      || getFromViewersCache(this.sender.userId, command.permission)
    ) {
      const text = message.trim().replace(new RegExp('^(' + command.command + ')', 'i'), '').trim();
      const opts = {
        sender: sender,
        command: command.command,
        parameters: text.trim(),
        attr: {
          skip: this.skip,
          quiet: this.quiet,
        },
      };

      if (_.isNil(command.id)) {
        throw Error(`command id is missing from ${command.fnc}`);
      };

      if (typeof command.fnc === 'function' && !_.isNil(command.id)) {
        incrementCountOfCommandUsage(command.command);
        debug('parser.command', 'Running ' + command.command);
        return command.fnc.apply(command.this, [opts]);
      } else {
        error(command.command + ' have wrong undefined function ' + command._fncName + '() registered!');
      };
    } else {
      // user doesn't have permissions for command
      sender['message-type'] = 'whisper';
      sendMessage(translate('permissions.without-permission').replace(/\$command/g, message), sender, {});

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
    }
  }
}

export default Parser;
export { Parser };