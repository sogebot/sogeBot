import * as constants from '@sogebot/ui-helpers/constants';
import _ from 'lodash';
import { getRepository } from 'typeorm';

import { parserReply } from '../commons';
import {
  Commands, CommandsInterface, CommandsResponsesInterface,
} from '../database/entity/commands';
import {
  command, default_permission, helper,
} from '../decorators';
import { parser } from '../decorators';
import Expects from '../expects';
import { checkFilter } from '../helpers/checkFilter';
import {
  getAllCountOfCommandUsage, getCountOfCommandUsage, incrementCountOfCommandUsage, resetCountOfCommandUsage,
} from '../helpers/commands/count';
import { prepare } from '../helpers/commons';
import { warning } from '../helpers/log';
import {
  addToViewersCache, get, getFromViewersCache,
} from '../helpers/permissions';
import { check, defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import { translate } from '../translate';
import System from './_interface';

/*
 * !command                                                                            - gets an info about command usage
 * !command add (-p [uuid|name]) ?-s true|false -c ![cmd] -r [response]                - add command with specified response
 * !command edit (-p [uuid|name]) ?-s true|false -c ![cmd] -rid [number] -r [response] - edit command with specified response
 * !command remove -c ![cmd]                                                           - remove specified command
 * !command remove -c ![cmd] -rid [number]                                             - remove specified response of command
 * !command toggle ![cmd]                                                              - enable/disable specified command
 * !command toggle-visibility ![cmd]                                                   - enable/disable specified command
 * !command list                                                                       - get commands list
 * !command list ![cmd]                                                                - get responses of command
 */

let cacheValid = false;
const findCache: {
  search: string;
  commands: {
    command: CommandsInterface;
    cmdArray: string[];
  }[]
}[] = [];

class CustomCommands extends System {
  constructor () {
    super();
    this.addMenu({
      category: 'commands', name: 'customcommands', id: 'commands/customcommands', this: this,
    });
  }

  sockets () {
    adminEndpoint(this.nsp, 'commands::resetCountByCommand', async (cmd: string, cb) => {
      await resetCountOfCommandUsage(cmd);
      cb(null);
    });
    adminEndpoint(this.nsp, 'generic::setById', async (opts, cb) => {
      try {
        const item = await getRepository(Commands).findOne({ id: String(opts.id) });
        await getRepository(Commands).save({ ...item, ...opts.item });
        this.invalidateCache();
        if (typeof cb === 'function') {
          cb(null, item);
        }
      } catch (e) {
        if (typeof cb === 'function') {
          cb(e.stack);
        }
      }
    });
    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      await getRepository(Commands).delete({ id: String(id) });
      this.invalidateCache();
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const commands = await getRepository(Commands).find({
          relations: ['responses'],
          order:     { command: 'ASC' },
        });
        const count = await getAllCountOfCommandUsage();
        cb(null, commands, count);
      } catch (e) {
        cb(e.stack, [], null);
      }
    });
    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      try {
        const cmd = await getRepository(Commands).findOne({
          where:     { id },
          relations: ['responses'],
        });
        if (!cmd) {
          cb(null, null, 0);
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
  @default_permission(defaultPermissions.CASTERS)
  @helper()
  main (opts: CommandOptions) {
    let url = 'http://sogehige.github.io/sogeBot/#/systems/custom-commands';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogehige.github.io/sogeBot/#/_master/systems/custom-commands';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!command edit')
  @default_permission(defaultPermissions.CASTERS)
  async edit (opts: CommandOptions) {
    try {
      const [userlevel, stopIfExecuted, cmd, rId, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: defaultPermissions.VIEWERS })
        .argument({
          optional: true, name: 's', default: null, type: Boolean,
        })
        .argument({
          name: 'c', type: String, multi: true, delimiter: '',
        })
        .argument({ name: 'rid', type: Number })
        .argument({
          name: 'r', type: String, multi: true, delimiter: '',
        })
        .toArray();

      if (!cmd.startsWith('!')) {
        throw Error('Command should start with !');
      }

      const cDb = await getRepository(Commands).findOne({
        relations: ['responses'],
        where:     { command: cmd },
      });
      if (!cDb) {
        return [{ response: prepare('customcmds.command-was-not-found', { command: cmd }), ...opts }];
      }

      const responseDb = cDb.responses.find(o => o.order === (rId - 1));
      if (!responseDb) {
        return [{ response: prepare('customcmds.response-was-not-found', { command: cmd, response: rId }), ...opts }];
      }

      const pItem = await get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      responseDb.response = response;
      responseDb.permission = pItem.id ?? defaultPermissions.VIEWERS;
      if (stopIfExecuted) {
        responseDb.stopIfExecuted = stopIfExecuted;
      }

      await getRepository(Commands).save(cDb);
      this.invalidateCache();
      return [{ response: prepare('customcmds.command-was-edited', { command: cmd, response }), ...opts }];
    } catch (e) {
      return [{ response: prepare('customcmds.commands-parse-failed', { command: this.getCommand('!command') }), ...opts }];
    }
  }

  @command('!command add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [userlevel, stopIfExecuted, cmd, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: defaultPermissions.VIEWERS })
        .argument({
          optional: true, name: 's', default: false, type: Boolean,
        })
        .argument({
          name: 'c', type: String, multi: true, delimiter: '',
        })
        .argument({
          name: 'r', type: String, multi: true, delimiter: '',
        })
        .toArray();

      if (!cmd.startsWith('!')) {
        throw Error('Command should start with !');
      }

      const cDb = await getRepository(Commands).findOne({
        relations: ['responses'],
        where:     { command: cmd },
      });
      if (!cDb) {
        await getRepository(Commands).save({
          command: cmd, enabled: true, visible: true,
        });
        return this.add(opts);
      }

      const pItem = await get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      await getRepository(Commands).save({
        ...cDb,
        responses: [...cDb.responses, {
          order:          cDb.responses.length,
          permission:     pItem.id ?? defaultPermissions.VIEWERS,
          stopIfExecuted: stopIfExecuted,
          response:       response,
          filter:         '',
        }],
      });
      this.invalidateCache();
      return [{ response: prepare('customcmds.command-was-added', { command: cmd }), ...opts }];
    } catch (e) {
      return [{ response: prepare('customcmds.commands-parse-failed', { command: this.getCommand('!command') }), ...opts }];
    }
  }

  invalidateCache() {
    cacheValid = false;
  }

  async find(search: string) {
    const commands: {
      command: CommandsInterface;
      cmdArray: string[];
    }[] = [];
    if (!cacheValid) {
      // we need to purge findCache and make cacheValid again
      while(findCache.length > 0) {
        findCache.shift();
      }
      cacheValid = true;
    }

    const fromCache = findCache.find(o => o.search === search);
    if (fromCache) {
      return fromCache.commands;
    } else {
      const cmdArray = search.toLowerCase().split(' ');
      for (let i = 0, len = search.toLowerCase().split(' ').length; i < len; i++) {
        const db_commands: CommandsInterface[]
          = await getRepository(Commands).find({
            relations: ['responses'],
            where:     { command: cmdArray.join(' ') },
          });
        for (const cmd of db_commands) {
          commands.push({
            cmdArray: _.cloneDeep(cmdArray),
            command:  cmd,
          });
        }
        cmdArray.pop(); // remove last array item if not found
      }
      findCache.push({ search, commands });
      return commands;
    }
  }

  @parser({ priority: constants.LOW })
  async run (opts: ParserOptions & { quiet?: boolean, processedCommands?: string[] }): Promise<boolean> {
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
        atLeastOnePermissionOk = true; // continue if command is disabled
        warning(`Custom command ${cmd.command.command} (${cmd.command.id}) is disabled!`);
        continue;
      }
      const _responses: CommandsResponsesInterface[] = [];
      // remove found command from message to get param
      const param = opts.message.replace(new RegExp('^(' + cmd.cmdArray.join(' ') + ')', 'i'), '').trim();
      await incrementCountOfCommandUsage(cmd.command.command);
      for (const r of _.orderBy(cmd.command.responses, 'order', 'asc')) {
        if (typeof getFromViewersCache(opts.sender.userId, r.permission) === 'undefined') {
          addToViewersCache(opts.sender.userId, r.permission, (await check(opts.sender.userId, r.permission, false)).access);
        }

        if ((opts.skip || getFromViewersCache(opts.sender.userId, r.permission))
            && await checkFilter(opts, r.filter)) {
          _responses.push(r);
          atLeastOnePermissionOk = true;
          if (r.stopIfExecuted) {
            break;
          }
        }
      }

      if (!opts.quiet) {
        this.sendResponse(_.cloneDeep(_responses), {
          param, sender: opts.sender, command: cmd.command.command, processedCommands: opts.processedCommands,
        });
      }
    }
    return atLeastOnePermissionOk;
  }

  sendResponse(responses: (CommandsResponsesInterface)[], opts: { param: string; sender: CommandOptions['sender'], command: string, processedCommands?: string[] }) {
    for (let i = 0; i < responses.length; i++) {
      setTimeout(async () => {
        parserReply(await responses[i].response, opts);
      }, i * 500);
    }
  }

  @command('!command list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions) {
    const cmd = new Expects(opts.parameters).command({ optional: true }).toArray()[0];

    if (!cmd) {
      // print commands
      const commands = await getRepository(Commands).find({ where: { visible: true, enabled: true } });
      const response = (commands.length === 0 ? translate('customcmds.list-is-empty') : translate('customcmds.list-is-not-empty').replace(/\$list/g, _.orderBy(commands, 'command').map(o => o.command).join(', ')));
      return [{ response, ...opts }];
    } else {
      // print responses
      const command_with_responses
        = await getRepository(Commands).findOne({
          relations: ['responses'],
          where:     { command: cmd },
        });

      if (!command_with_responses || command_with_responses.responses.length === 0) {
        return [{ response: prepare('customcmds.list-of-responses-is-empty', { command: cmd }), ...opts }];
      }
      return Promise.all(_.orderBy(command_with_responses.responses, 'order', 'asc').map(async(r) => {
        const perm = await get(r.permission);
        const response = prepare('customcmds.response', {
          command: cmd, index: ++r.order, response: r.response, after: r.stopIfExecuted ? '_' : 'v', permission: perm?.name ?? 'n/a',
        });
        return { response, ...opts };
      }));
    }
  }

  @command('!command toggle')
  @default_permission(defaultPermissions.CASTERS)
  async toggle (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [cmdInput, subcommand] = new Expects(opts.parameters)
        .command()
        .string({ optional: true })
        .toArray();

      const cmd = await getRepository(Commands).findOne({ where: { command: (cmdInput + ' ' + subcommand).trim() } });
      if (!cmd) {
        const response = prepare('customcmds.command-was-not-found', { command: (cmdInput + ' ' + subcommand).trim() });
        return [{ response, ...opts }];
      }
      await getRepository(Commands).save({
        ...cmd,
        enabled: !cmd.enabled,
      });
      this.invalidateCache();
      return [{ response: prepare(!cmd.enabled ? 'customcmds.command-was-enabled' : 'customcmds.command-was-disabled', { command: cmd.command }), ...opts }];
    } catch (e) {
      const response = prepare('customcmds.commands-parse-failed', { command: this.getCommand('!command') });
      return [{ response, ...opts }];
    }
  }

  @command('!command toggle-visibility')
  @default_permission(defaultPermissions.CASTERS)
  async toggleVisibility (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [cmdInput, subcommand] = new Expects(opts.parameters)
        .command()
        .string({ optional: true })
        .toArray();

      const cmd = await getRepository(Commands).findOne({ where: { command: (cmdInput + ' ' + subcommand).trim() } });
      if (!cmd) {
        const response = prepare('customcmds.command-was-not-found', { command: (cmdInput + ' ' + subcommand).trim() });
        return [{ response, ...opts }];
      }
      await getRepository(Commands).save({ ...cmd, visible: !cmd.visible });

      const response = prepare(!cmd.visible ? 'customcmds.command-was-exposed' : 'customcmds.command-was-concealed', { command: cmd.command });
      this.invalidateCache();
      return [{ response, ...opts }];

    } catch (e) {
      const response = prepare('customcmds.commands-parse-failed', { command: this.getCommand('!command') });
      return [{ response, ...opts }];
    }
  }

  @command('!command remove')
  @default_permission(defaultPermissions.CASTERS)
  async remove (opts: CommandOptions) {
    try {
      const [cmd, rId] = new Expects(opts.parameters)
        .argument({
          name: 'c', type: String, multi: true, delimiter: '',
        })
        .argument({
          name: 'rid', type: Number, optional: true, default: 0,
        })
        .toArray();

      if (!cmd.startsWith('!')) {
        throw Error('Command should start with !');
      }

      const command_db = await getRepository(Commands).findOne({
        where:     { command: cmd },
        relations: [ 'responses' ],
      });
      if (!command_db) {
        return [{ response: prepare('customcmds.command-was-not-found', { command: cmd }), ...opts }];
      } else {
        let response = prepare('customcmds.command-was-removed', { command: cmd });
        if (rId >= 1) {
          const responseDb = command_db.responses.filter(o => o.order !== (rId - 1));
          // reorder
          responseDb.forEach((item, index) => {
            item.order = index;
          });
          await getRepository(Commands).save({
            ...command_db,
            responses: responseDb,
          });
          response = prepare('customcmds.response-was-removed', { command: cmd, response: rId });
        } else {
          await getRepository(Commands).remove(command_db);
        }
        this.invalidateCache();
        return [{ response, ...opts }];
      }
    } catch (e) {
      return [{ response: prepare('customcmds.commands-parse-failed', { command: this.getCommand('!command') }), ...opts }];
    }
  }
}

export default new CustomCommands();
