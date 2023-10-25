import { Alias as AliasEntity, AliasGroup } from '@entity/alias.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import { validateOrReject } from 'class-validator';
import * as _ from 'lodash-es';
import { merge } from 'lodash-es';

import System from './_interface.js';
import { parserReply } from '../commons.js';
import {
  command, default_permission, parser, timer,
} from '../decorators.js';
import { Expects } from  '../expects.js';
import { isValidationError } from '../helpers/errors.js';
import { Parser } from '../parser.js';

import { AppDataSource } from '~/database.js';
import { checkFilter } from '~/helpers/checkFilter.js';
import { incrementCountOfCommandUsage } from '~/helpers/commands/count.js';
import { prepare } from '~/helpers/commons/index.js';
import { executeVariablesInText } from '~/helpers/customvariables/index.js';
import {
  debug, error, info, warning,
} from '~/helpers/log.js';
import { check } from '~/helpers/permissions/check.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { get } from '~/helpers/permissions/get.js';
import { adminEndpoint } from '~/helpers/socket.js';
import customCommands from '~/systems/customcommands.js';
import { translate } from '~/translate.js';

/*
 * !alias                                              - gets an info about alias usage
 * !alias group -set [group] -a ![alias]               - add alias to group
 * !alias group -unset ![alias]                     - unset alias from group
 * !alias group -list                                  - list alias groups
 * !alias group -list [group]                          - list alias group by name
 * !alias group -enable [group]                        - enable alias group by name
 * !alias group -disable [group]                       - disable alias group by name
 * !alias add (-p [uuid|name]) -a ![alias] -c ![cmd]   - add alias for specified command
 * !alias edit (-p [uuid|name]) -a ![alias] -c ![cmd]  - add alias for specified command
 * !alias remove ![alias]                              - remove specified alias
 * !alias toggle ![alias]                              - enable/disable specified alias
 * !alias toggle-visibility ![alias]                   - enable/disable specified alias
 * !alias list                                         - get alias list
 */

class Alias extends System {
  constructor () {
    super();

    this.addMenu({
      category: 'commands', name: 'alias', id: 'commands/alias', this: this,
    });
  }

  sockets() {
    adminEndpoint('/systems/alias', 'generic::groups::deleteById', async (name, cb) => {
      try {
        const group = await AliasGroup.findOneBy({ name });
        if (!group) {
          throw new Error(`Group ${name} not found`);
        }
        await group.remove();
        cb(null);
      } catch (e) {
        cb(e as Error);
      }
    });
    adminEndpoint('/systems/alias', 'generic::groups::save', async (item, cb) => {
      try {
        const itemToSave = new AliasGroup();
        merge(itemToSave, item);
        await itemToSave.save();
        cb(null, itemToSave);
      } catch (e) {
        if (e instanceof Error) {
          cb(e.message, undefined);
        }
      }
    });
    adminEndpoint('/systems/alias', 'generic::groups::getAll', async (cb) => {
      let groupsList = await AliasGroup.find();
      for (const item of await AliasEntity.find()) {
        if (item.group && !groupsList.find(o => o.name === item.group)) {
          // we dont have any group options -> create temporary group
          const group = new AliasGroup();
          group.name = item.group;
          group.options = {
            filter:     null,
            permission: null,
          };
          groupsList = [
            ...groupsList,
            group,
          ];
        }
      }
      cb(null, groupsList);
    });
    adminEndpoint('/systems/alias', 'generic::getAll', async (cb) => {
      cb(null, await AliasEntity.find());
    });
    adminEndpoint('/systems/alias', 'generic::getOne', async (id, cb) => {
      cb(null, await AliasEntity.findOneBy({ id }));
    });
    adminEndpoint('/systems/alias', 'generic::deleteById', async (id, cb) => {
      try {
        const alias = await AliasEntity.findOneBy({ id });
        if (!alias) {
          throw new Error(`Alias ${id} not found`);
        }
        await alias.remove();
        cb(null);
      } catch (e) {
        cb(e as Error);
      }
    });
    adminEndpoint('/systems/alias', 'generic::save', async (item, cb) => {
      try {
        const itemToSave = new AliasEntity();
        merge(itemToSave, item);
        await validateOrReject(itemToSave);
        await itemToSave.save();
        cb(null, itemToSave);
      } catch (e) {
        if (e instanceof Error) {
          cb(e.message, undefined);
        }
        if (isValidationError(e)) {
          cb(e, undefined);
        }
      }
    });
  }

  async search(opts: ParserOptions): Promise<[Readonly<Required<AliasEntity>> | null, string[]]> {
    let alias: Readonly<Required<AliasEntity>> | undefined;
    const cmdArray = opts.message.toLowerCase().split(' ');

    // is it an command?
    if (!opts.message.startsWith('!')) {
      return [null, cmdArray];
    }

    const length = opts.message.toLowerCase().split(' ').length;
    const aliases = await AliasEntity.find();
    for (let i = 0; i < length; i++) {
      alias = aliases.find(o => o.alias === cmdArray.join(' ') && o.enabled);
      if (alias) {
        return [alias, cmdArray];
      }
      cmdArray.pop(); // remove last array item if not found
    }
    return [null, cmdArray];
  }

  @timer()
  @parser({ priority: constants.HIGH, fireAndForget: true })
  async run (opts: ParserOptions): Promise<boolean> {
    const alias = (await this.search(opts))[0];
    if (!alias || !opts.sender) {
      return true;
    } // no alias was found - return

    const replace = new RegExp(`${alias.alias}`, 'i');
    const cmdArray = opts.message.replace(replace, `${alias.command}`).split(' ');
    let tryingToBypass = false;

    const length = opts.message.toLowerCase().split(' ').length;
    for (let i = 0; i < length; i++) { // search for correct alias
      if (cmdArray.length === alias.command.split(' ').length) {
        break;
      } // command is correct (have same number of parameters as command)

      const parsedCmd = await (opts.parser || new Parser()).find(cmdArray.join(' '), null);
      const isRegistered = !_.isNil(parsedCmd) && parsedCmd.command.split(' ').length === cmdArray.length;

      if (isRegistered) {
        tryingToBypass = true;
        break;
      }
      cmdArray.pop(); // remove last array item if not found
    }
    if (!tryingToBypass) {
      // Don't run alias if its same as command e.g. alias !me -> command !me
      if (alias.command === alias.alias) {
        warning(`Cannot run alias ${alias.alias}, because it exec ${alias.command}`);
        return false;
      } else {
        let permission = alias.permission;
        // load alias group if any
        if (alias.group) {
          const group = await AliasGroup.findOneBy({ name: alias.group });
          if (group) {
            if (group.options.filter && !(await checkFilter(opts, group.options.filter))) {
              warning(`Alias ${alias.alias}#${alias.id} didn't pass group filter.`);
              return true;
            }
            if (permission === null) {
              permission = group.options.permission;
            }
          }
        }

        // show warning if null permission
        if (!permission) {
          permission = defaultPermissions.CASTERS;
          warning(`Alias ${alias.alias}#${alias.id} doesn't have any permission set, treating as CASTERS permission.`);
        }

        if (opts.skip || (await check(opts.sender.userId, permission, false)).access) {
          // process custom variables
          const response = await executeVariablesInText(
            opts.message.replace(replace, alias.command), {
              sender: {
                userId:   opts.sender.userId,
                username: opts.sender.userName,
                source:   typeof opts.discord === 'undefined' ? 'twitch' : 'discord',
              },
            });
          debug('alias.process', response);
          const responses = await (opts.parser || new Parser()).command(opts.sender, response, true);
          debug('alias.process', responses);
          for (let i = 0; i < responses.length; i++) {
            await parserReply(responses[i].response, { sender: responses[i].sender, discord: responses[i].discord, attr: responses[i].attr, id: opts.id });
          }
          // go through custom commands
          if (response.startsWith('!')) {
            customCommands.run({ ...opts, message: response });
          }

          incrementCountOfCommandUsage(alias.alias);
        } else {
          info(`User ${opts.sender.userName}#${opts.sender.userId} doesn't have permissions to use ${alias.alias}`);
          return false;
        }
      }
    }
    return true;
  }

  @command('!alias')
  @default_permission(defaultPermissions.CASTERS)
  main (opts: CommandOptions): CommandResponse[] {
    let url = 'http://sogebot.github.io/sogeBot/#/systems/alias';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogebot.github.io/sogeBot/#/_master/systems/alias';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!alias group')
  @default_permission(defaultPermissions.CASTERS)
  async group (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (opts.parameters.includes('-set')) {
        const [alias, group] = new Expects(opts.parameters)
          .argument({
            name: 'a', type: String, multi: true, delimiter: '',
          }) // set as multi as alias can contain spaces
          .argument({
            name: 'set', type: String, multi: true, delimiter: '',
          }) // set as multi as group can contain spaces
          .toArray();
        const item = await AliasEntity.findOneBy({ alias });
        if (!item) {
          const response = prepare('alias.alias-was-not-found', { alias });
          return [{ response, ...opts }];
        }
        await AppDataSource.getRepository(AliasEntity).save({ ...item, group });
        const response = prepare('alias.alias-group-set', { ...item, group });
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-unset')) {
        const [alias] = new Expects(opts.parameters)
          .argument({
            name: 'unset', type: String, multi: true, delimiter: '',
          }) // set as multi as alias can contain spaces
          .toArray();
        const item = await AliasEntity.findOneBy({ alias });
        if (!item) {
          const response = prepare('alias.alias-was-not-found', { alias });
          return [{ response, ...opts }];
        }
        await AppDataSource.getRepository(AliasEntity).save({ ...item, group: null });
        const response = prepare('alias.alias-group-unset', item);
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-list')) {
        const [group] = new Expects(opts.parameters)
          .argument({
            name: 'list', type: String, optional: true, multi: true, delimiter: '',
          }) // set as multi as group can contain spaces
          .toArray();
        if (group) {
          const items = await AliasEntity.findBy({ visible: true, enabled: true, group });
          const response = prepare('alias.alias-group-list-aliases', { group, list: items.length > 0 ? items.map(o => o.alias).sort().join(', ') : `<${translate('core.empty')}>` });
          return [{ response, ...opts }];
        } else {
          const aliases = await AliasEntity.find();
          const _groups = [...new Set(aliases.map(o => o.group).filter(o => !!o).sort())];
          const response = prepare('alias.alias-group-list', { list: _groups.length > 0 ? _groups.join(', ') : `<${translate('core.empty')}>` });
          return [{ response, ...opts }];
        }
      } else if (opts.parameters.includes('-enable')) {
        const [group] = new Expects(opts.parameters)
          .argument({
            name: 'enable', type: String, multi: true, delimiter: '',
          }) // set as multi as group can contain spaces
          .toArray();
        await AppDataSource.getRepository(AliasEntity).update({ group }, { enabled: true });
        const response = prepare('alias.alias-group-list-enabled', { group });
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-disable')) {
        const [group] = new Expects(opts.parameters)
          .argument({
            name: 'disable', type: String, multi: true, delimiter: '',
          }) // set as multi as group can contain spaces
          .toArray();
        await AppDataSource.getRepository(AliasEntity).update({ group }, { enabled: false });
        const response = prepare('alias.alias-group-list-disabled', { group });
        return [{ response, ...opts }];
      } else {
        throw new Error('-set, -unset, -enable, -disable or -list not found in command.');
      }
    } catch (e: any) {
      error(e.stack);
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }

  }

  @command('!alias edit')
  @default_permission(defaultPermissions.CASTERS)
  async edit (opts: CommandOptions) {
    try {
      const [perm, alias, cmd] = new Expects(opts.parameters)
        .permission({ optional: true, default: defaultPermissions.VIEWERS })
        .argument({
          name: 'a', type: String, multi: true, delimiter: '',
        }) // set as multi as alias can contain spaces
        .argument({
          name: 'c', type: String, multi: true, delimiter: '',
        }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !(cmd.startsWith('!') || cmd.startsWith('$_'))) {
        throw Error('Alias/Command doesn\'t start with ! or command is not custom variable');
      }

      const pItem = await get(perm);
      if (!pItem) {
        throw Error('Permission ' + perm + ' not found.');
      }

      const item = await AliasEntity.findOneBy({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      item.command = cmd;
      item.permission = pItem.id ?? defaultPermissions.VIEWERS;
      await item.save();

      const response = prepare('alias.alias-was-edited', { alias, command: cmd });
      return [{ response, ...opts }];
    } catch (e: any) {
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }
  }

  @command('!alias add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions) {
    try {
      const [perm, alias, cmd] = new Expects(opts.parameters)
        .permission({ optional: true, default: defaultPermissions.VIEWERS })
        .argument({
          name: 'a', type: String, multi: true, delimiter: '',
        }) // set as multi as alias can contain spaces
        .argument({
          name: 'c', type: String, multi: true, delimiter: '',
        }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !(cmd.startsWith('!') || cmd.startsWith('$_'))) {
        throw Error('Alias/Command doesn\'t start with ! or command is not custom variable');
      }

      const pItem = await get(perm);
      if (!pItem) {
        throw Error('Permission ' + perm + ' not found.');
      }

      const newAlias = new AliasEntity();
      newAlias.alias = alias;
      newAlias.command = cmd;
      newAlias.enabled = true;
      newAlias.visible = true;
      newAlias.permission = pItem.id ?? defaultPermissions.VIEWERS;
      await newAlias.save();
      const response = prepare('alias.alias-was-added', newAlias);
      return [{ response, ...opts }];
    } catch (e: any) {
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }
  }

  @command('!alias list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions) {
    const alias = await AliasEntity.findBy({ visible: true, enabled: true });
    const response
      = (alias.length === 0
        ? translate('alias.list-is-empty')
        : translate('alias.list-is-not-empty'))
        .replace(/\$list/g, _.orderBy(alias, 'alias').map(o => o.alias).join(', '));
    return [{ response, ...opts }];
  }

  @command('!alias toggle')
  @default_permission(defaultPermissions.CASTERS)
  async toggle (opts: CommandOptions) {
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !');
      }

      const item = await AliasEntity.findOneBy({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      item.enabled = !item.enabled;
      await item.save();
      const response = prepare(item.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', item);
      return [{ response, ...opts }];
    } catch (e: any) {
      console.log({ e });
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }

  @command('!alias toggle-visibility')
  @default_permission(defaultPermissions.CASTERS)
  async toggleVisibility (opts: CommandOptions) {
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !');
      }

      const item = await AliasEntity.findOneBy({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      item.visible = !item.visible;
      await item.save();
      const response = prepare(item.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', item);
      return [{ response, ...opts }];
    } catch (e: any) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }

  @command('!alias remove')
  @default_permission(defaultPermissions.CASTERS)
  async remove (opts: CommandOptions) {
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !');
      }

      const item = await AliasEntity.findOneBy({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      await AppDataSource.getRepository(AliasEntity).remove(item);
      const response = prepare('alias.alias-was-removed', { alias });
      return [{ response, ...opts }];
    } catch (e: any) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }
}

export default new Alias();
