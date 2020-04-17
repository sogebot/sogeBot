import _ from 'lodash';
import XRegExp from 'xregexp';
import safeEval from 'safe-eval';

import { command, default_permission, helper } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import * as constants from '../constants';
import { parser } from '../decorators';
import Expects from '../expects';
import { isBot, isBroadcaster, isModerator, isOwner, isSubscriber, isVIP, prepare, sendMessage } from '../commons';
import { getAllCountOfCommandUsage, getCountOfCommandUsage, incrementCountOfCommandUsage, resetCountOfCommandUsage } from '../helpers/commands/count';

import { warning } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { Commands, CommandsInterface, CommandsResponsesInterface } from '../database/entity/commands';
import { User } from '../database/entity/user';
import { Variable } from '../database/entity/variable';
import { addToViewersCache, getFromViewersCache } from '../helpers/permissions';
import api from '../api';
import permissions from '../permissions';
import { translate } from '../translate';
import ranks from './ranks';

/*
 * !command                                                                 - gets an info about command usage
 * !command add (-p [uuid|name]) ?-s true|false ![cmd] [response]           - add command with specified response
 * !command edit (-p [uuid|name]) ?-s true|false ![cmd] [number] [response] - edit command with specified response
 * !command remove ![cmd]                                                   - remove specified command
 * !command remove ![cmd] [number]                                          - remove specified response of command
 * !command toggle ![cmd]                                                   - enable/disable specified command
 * !command toggle-visibility ![cmd]                                        - enable/disable specified command
 * !command list                                                            - get commands list
 * !command list ![cmd]                                                     - get responses of command
 */

class CustomCommands extends System {
  constructor () {
    super();
    this.addMenu({ category: 'manage', name: 'customcommands', id: 'manage/commands' });
  }

  sockets () {
    adminEndpoint(this.nsp, 'commands::resetCountByCommand', async (cmd: string, cb) => {
      await resetCountOfCommandUsage(cmd);
      cb(null);
    });
    adminEndpoint(this.nsp, 'commands::setById', async (id, dataset: CommandsInterface, cb: Function | SocketIOClient.Socket) => {
      try {
        const item = await getRepository(Commands).findOne({ id });
        await getRepository(Commands).save({ ...item, ...dataset});
        if (typeof cb === 'function') {
          cb(null, item);
        }
      } catch (e) {
        if (typeof cb === 'function') {
          cb(e.stack);
        }
      }
    });
    adminEndpoint(this.nsp, 'commands::deleteById', async (id, cb) => {
      await getRepository(Commands).delete({ id });
      cb();
    });
    adminEndpoint(this.nsp, 'commands::getAll', async (cb) => {
      try {
        const commands = await getRepository(Commands).find({
          relations: ['responses'],
          order: {
            command: 'ASC',
          },
        });
        const count = await getAllCountOfCommandUsage();
        cb(null, commands, count);
      } catch (e) {
        cb(e.stack, [], null);
      }
    });
    adminEndpoint(this.nsp, 'commands::getById', async (id, cb) => {
      try {
        const cmd = await getRepository(Commands).findOne({
          where: { id },
          relations: ['responses'],
        });
        if (!cmd) {
          cb('Command not found');
        } else {
          const count = await getCountOfCommandUsage(cmd.command);
          cb(null, cmd, count);
        }
      } catch (e) {
        cb (e);
      }
    });
  }

  @command('!command')
  @default_permission(permission.CASTERS)
  @helper()
  main (opts: CommandOptions) {
    return [{ response: translate('core.usage') + ': !command add (-p [uuid|name]) (-s=true|false) <!cmd> <response> | !command edit (-p [uuid|name]) (-s=true|false) <!cmd> <number> <response> | !command remove <!command> | !command remove <!command> <number> | !command list | !command list <!command>', ...opts }];
  }

  @command('!command edit')
  @default_permission(permission.CASTERS)
  async edit (opts: CommandOptions) {
    try {
      const [userlevel, stopIfExecuted, cmd, rId, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ optional: true, name: 's', default: null, type: Boolean })
        .argument({ name: 'c', type: String, multi: true, delimiter: '' })
        .argument({ name: 'rid', type: Number })
        .argument({ name: 'r', type: String, multi: true, delimiter: '' })
        .toArray();

      if (!cmd.startsWith('!')) {
        throw Error('Command should start with !');
      }

      const cDb = await getRepository(Commands).findOne({
        relations: ['responses'],
        where: {
          command: cmd,
        },
      });
      if (!cDb) {
        return [{ response: prepare('customcmds.command-was-not-found', { command: cmd }), ...opts }];
      }

      const responseDb = cDb.responses.find(o => o.order === (rId - 1));
      if (!responseDb) {
        return [{ response: prepare('customcmds.response-was-not-found', { command: cmd, response: rId }), ...opts }];
      }

      const pItem = await permissions.get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      responseDb.response = response;
      responseDb.permission = pItem.id ?? permission.VIEWERS;
      if (stopIfExecuted) {
        responseDb.stopIfExecuted = stopIfExecuted;
      }

      await getRepository(Commands).save(cDb);
      return [{ response: prepare('customcmds.command-was-edited', { command: cmd, response }), ...opts }];
    } catch (e) {
      return [{ response: prepare('customcmds.commands-parse-failed'), ...opts }];
    }
  }

  @command('!command add')
  @default_permission(permission.CASTERS)
  async add (opts: CommandOptions) {
    try {
      const [userlevel, stopIfExecuted, cmd, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ optional: true, name: 's', default: false, type: Boolean })
        .argument({ name: 'c', type: String, multi: true, delimiter: '' })
        .argument({ name: 'r', type: String, multi: true, delimiter: '' })
        .toArray();

      if (!cmd.startsWith('!')) {
        throw Error('Command should start with !');
      }

      const cDb = await getRepository(Commands).findOne({
        relations: ['responses'],
        where: {
          command: cmd,
        },
      });
      if (!cDb) {
        await getRepository(Commands).save({
          command: cmd, enabled: true, visible: true,
        });
        return this.add(opts);
      }

      const pItem = await permissions.get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      await getRepository(Commands).save({
        ...cDb,
        responses: [...cDb.responses, {
          order: cDb.responses.length,
          permission: pItem.id ?? permission.VIEWERS,
          stopIfExecuted: stopIfExecuted,
          response: response,
          filter: '',
        }],
      });
      return [{ response: prepare('customcmds.command-was-added', { command: cmd }), ...opts }];
    } catch (e) {
      return [{ response: prepare('customcmds.commands-parse-failed'), ...opts }];
    }
  }

  async find(search: string) {
    const commands: {
      command: CommandsInterface;
      cmdArray: string[];
    }[] = [];
    const cmdArray = search.toLowerCase().split(' ');
    for (let i = 0, len = search.toLowerCase().split(' ').length; i < len; i++) {
      const db_commands: CommandsInterface[]
        = await getRepository(Commands).find({
          relations: ['responses'],
          where: {
            command: cmdArray.join(' '),
          },
        });
      for (const cmd of db_commands) {
        commands.push({
          cmdArray: _.cloneDeep(cmdArray),
          command: cmd,
        });
      }
      cmdArray.pop(); // remove last array item if not found
    }
    return commands;
  }

  @parser({ priority: constants.LOW })
  async run (opts: ParserOptions): Promise<boolean> {
    if (!opts.message.startsWith('!')) {
      return true;
    } // do nothing if it is not a command

    const commands = await this.find(opts.message);

    if (commands.length === 0) {
      return true;
    } // no command was found - return

    // go through all commands
    let atLeastOnePermissionOk = false;
    for (const cmd of commands) {
      if (!cmd.command.enabled) {
        warning(`Custom command ${cmd.command.command} (${cmd.command.id}) is disabled!`);
        continue;
      }
      const _responses: CommandsResponsesInterface[] = [];
      // remove found command from message to get param
      const param = opts.message.replace(new RegExp('^(' + cmd.cmdArray.join(' ') + ')', 'i'), '').trim();
      const count = await incrementCountOfCommandUsage(cmd.command.command);
      for (const r of _.orderBy(cmd.command.responses, 'order', 'asc')) {

        if (typeof getFromViewersCache(opts.sender.userId, r.permission) === 'undefined') {
          addToViewersCache(opts.sender.userId, r.permission, (await permissions.check(opts.sender.userId, r.permission, false)).access);
        }

        if (getFromViewersCache(opts.sender.userId, r.permission)
            && await this.checkFilter(opts, r.filter)) {
          _responses.push(r);
          atLeastOnePermissionOk = true;
          if (r.stopIfExecuted) {
            break;
          }
        }
      }
      this.sendResponse(_.cloneDeep(_responses), { param, sender: opts.sender, command: cmd.command.command, count });
    }
    return atLeastOnePermissionOk;
  }

  sendResponse(responses, opts) {
    for (let i = 0; i < responses.length; i++) {
      setTimeout(() => {
        if (opts.sender.discord) {
          opts.sender.discord.channel.send(responses[i].response);
        } else {
          sendMessage(responses[i].response, opts.sender, {
            param: opts.param,
            cmd: opts.command,
          });
        }
      }, i * 500);
    }
  }

  @command('!command list')
  @default_permission(permission.CASTERS)
  async list (opts: CommandOptions) {
    const cmd = new Expects(opts.parameters).command({ optional: true }).toArray()[0];

    if (!cmd) {
      // print commands
      const commands = await getRepository(Commands).find({
        where: { visible: true, enabled: true },
      });
      const response = (commands.length === 0 ? translate('customcmds.list-is-empty') : translate('customcmds.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(commands, 'command'), 'command').join(', ')));
      return [{ response, ...opts }];
    } else {
      // print responses
      const command_with_responses
        = await getRepository(Commands).findOne({
          relations: ['responses'],
          where: { command: cmd },
        });

      if (!command_with_responses || command_with_responses.responses.length === 0) {
        return [{ response: prepare('customcmdustomcmds.list-of-responses-is-empty', { command: cmd }), ...opts }];
      }
      return Promise.all(_.orderBy(command_with_responses.responses, 'order', 'asc').map(async(r) => {
        const perm = await permissions.get(r.permission);
        const response = prepare('customcmds.response', { command: cmd, index: ++r.order, response: r.response, after: r.stopIfExecuted ? '_' : 'v', permission: perm?.name ?? 'n/a' });
        return { response, ...opts };
      }));
    }
  }

  @command('!command toggle')
  @default_permission(permission.CASTERS)
  async toggle (opts: CommandOptions): Promise<CommandResponse[]> {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP) as unknown as { [x: string]: string } | null;
    if (_.isNil(match)) {
      const response = prepare('customcmds.commands-parse-failed');
      return [{ response, ...opts }];
    }
    const cmd = await getRepository(Commands).findOne({
      where: { command: match.command },
    });
    if (!cmd) {
      const response = prepare('customcmds.command-was-not-found', { command: match.command });
      return [{ response, ...opts }];
    }
    await getRepository(Commands).save({
      ...cmd,
      enabled: !cmd.enabled,
    });
    return [{ response: prepare(!cmd.enabled ? 'customcmds.command-was-enabled' : 'customcmds.command-was-disabled', { command: cmd.command }), ...opts }];
  }

  @command('!command toggle-visibility')
  @default_permission(permission.CASTERS)
  async toggleVisibility (opts: CommandOptions): Promise<CommandResponse[]> {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP) as unknown as { [x: string]: string } | null;
    if (_.isNil(match)) {
      const response = prepare('customcmds.commands-parse-failed');
      return [{ response, ...opts }];
    }

    const cmd = await getRepository(Commands).findOne({
      where: { command: match.command },
    });
    if (!cmd) {
      const response = prepare('customcmds.command-was-not-found', { command: match.command });
      return [{ response, ...opts }];
    }
    await getRepository(Commands).save({...cmd, visible: !cmd.visible});

    const response = prepare(!cmd.visible ? 'customcmds.command-was-exposed' : 'customcmds.command-was-concealed', { command: cmd.command });
    return [{ response, ...opts }];
  }

  @command('!command remove')
  @default_permission(permission.CASTERS)
  async remove (opts: CommandOptions) {
    try {
      const [cmd] = new Expects(opts.parameters).command().toArray();

      const command_db = await getRepository(Commands).findOne({
        where: { command: cmd },
      });
      if (!command_db) {
        return [{ response: prepare('customcmds.command-was-not-found', { command: cmd }), ...opts }];
      } else {
        await getRepository(Commands).remove(command_db);
        return [{ response: prepare('customcmds.command-was-removed', { command: cmd }), ...opts }];
      }
    } catch (e) {
      return [{ response: prepare('customcmds.commands-parse-failed'), ...opts }];
    }
  }

  async checkFilter (opts: CommandOptions | ParserOptions, filter: string) {
    if (typeof filter === 'undefined' || filter.trim().length === 0) {
      return true;
    }
    const toEval = `(function evaluation () { return ${filter} })()`;

    const $userObject = await getRepository(User).findOne({ userId: opts.sender.userId });
    if (!$userObject) {
      await getRepository(User).save({
        userId: opts.sender.userId,
        username: opts.sender.username,
      });
      return this.checkFilter(opts, filter);
    }
    let $rank: string | null = null;
    if (ranks.enabled) {
      const rank = await ranks.get($userObject);
      $rank = typeof rank.current === 'string' || rank.current === null ? rank.current : rank.current.rank;
    }

    const $is = {
      moderator: isModerator($userObject),
      subscriber: isSubscriber($userObject),
      vip: isVIP($userObject),
      broadcaster: isBroadcaster(opts.sender.username),
      bot: isBot(opts.sender.username),
      owner: isOwner(opts.sender.username),
    };

    // get custom variables
    const customVariablesDb = await getRepository(Variable).find();
    const customVariables = {};
    for (const cvar of customVariablesDb) {
      customVariables[cvar.variableName] = cvar.currentValue;
    }

    const context = {
      _: _,
      $sender: opts.sender.username,
      $is,
      $rank,
      $haveParam: opts.parameters.length > 0,
      // add global variables
      $game: api.stats.currentGame || 'n/a',
      $language: api.stats.language || 'en',
      $title: api.stats.currentTitle || 'n/a',
      $views: api.stats.currentViews,
      $followers: api.stats.currentFollowers,
      $hosts: api.stats.currentHosts,
      $subscribers: api.stats.currentSubscribers,
      ...customVariables,
    };
    let result = false;
    try {
      result = safeEval(toEval, context);
    } catch (e) {
      // do nothing
    }
    delete context._;
    return !!result; // force boolean
  }
}

export default new CustomCommands();
