'use strict';

import * as constants from '@sogebot/ui-helpers/constants';
import * as _ from 'lodash';
import { getRepository } from 'typeorm';

import { parserReply } from '../commons';
import { Alias as AliasEntity, AliasInterface } from '../database/entity/alias';
import {
  command, default_permission, parser, timer,
} from '../decorators';
import Expects from '../expects';
import * as cache from '../helpers/cache/alias';
import { incrementCountOfCommandUsage } from '../helpers/commands/count';
import { prepare } from '../helpers/commons';
import { executeVariablesInText } from '../helpers/customvariables';
import {
  debug, error, warning,
} from '../helpers/log';
import {
  addToViewersCache, get, getFromViewersCache,
} from '../helpers/permissions';
import { check, defaultPermissions } from '../helpers/permissions/';
import Parser from '../parser';
import { translate } from '../translate';
import System from './_interface';
import customcommands from './customcommands';

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

  async search(opts: ParserOptions): Promise<[Readonly<Required<AliasInterface>> | null, string[]]> {
    let alias: Readonly<Required<AliasInterface>> | undefined;
    let fromCache: Readonly<Required<AliasInterface>> | undefined;
    const cmdArray = opts.message.toLowerCase().split(' ');

    // is it an command?
    if (!opts.message.startsWith('!')) {
      return [null, cmdArray];
    }

    const length = opts.message.toLowerCase().split(' ').length;
    for (let i = 0; i < length; i++) {
      fromCache = cache.findCache.find(o => o.search === cmdArray.join(' '))?.alias;
      if (fromCache) {
        return [fromCache, cmdArray];
      }

      alias = await getRepository(AliasEntity).findOne({ alias: cmdArray.join(' '), enabled: true });
      if (alias) {
        cache.findCache.push({ search: cmdArray.join(' '), alias });
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
        if (typeof getFromViewersCache(opts.sender.userId, alias.permission) === 'undefined') {
          addToViewersCache(opts.sender.userId, alias.permission, (await check(opts.sender.userId, alias.permission, false)).access);
        }
        if (opts.skip || getFromViewersCache(opts.sender.userId, alias.permission)) {
          // process custom variables
          const response = await executeVariablesInText(
            opts.message.replace(replace, alias.command), {
              sender: {
                userId:   opts.sender.userId,
                username: opts.sender.userName,
                source:   typeof opts.sender.discord === 'undefined' ? 'twitch' : 'discord',
              },
            });
          debug('alias.process', response);
          const responses = await (opts.parser || new Parser()).command(opts.sender, response, true);
          debug('alias.process', responses);
          for (let i = 0; i < responses.length; i++) {
            await parserReply(responses[i].response, { sender: responses[i].sender, attr: responses[i].attr });
          }
          // go through custom commands
          if (response.startsWith('!')) {
            customcommands.run({ ...opts, message: response });
          }

          incrementCountOfCommandUsage(alias.alias);
        } else {
          return false;
        }
      }
    }
    return true;
  }

  @command('!alias')
  @default_permission(defaultPermissions.CASTERS)
  main (opts: CommandOptions): CommandResponse[] {
    let url = 'http://sogehige.github.io/sogeBot/#/systems/alias';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogehige.github.io/sogeBot/#/_master/systems/alias';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!alias group')
  @default_permission(defaultPermissions.CASTERS)
  async group (opts: CommandOptions): Promise<CommandResponse[]> {
    cache.invalidate();
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
        const item = await getRepository(AliasEntity).findOne({ alias });
        if (!item) {
          const response = prepare('alias.alias-was-not-found', { alias });
          return [{ response, ...opts }];
        }
        await getRepository(AliasEntity).save({ ...item, group });
        const response = prepare('alias.alias-group-set', { ...item, group });
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-unset')) {
        const [alias] = new Expects(opts.parameters)
          .argument({
            name: 'unset', type: String, multi: true, delimiter: '',
          }) // set as multi as alias can contain spaces
          .toArray();
        const item = await getRepository(AliasEntity).findOne({ alias });
        if (!item) {
          const response = prepare('alias.alias-was-not-found', { alias });
          return [{ response, ...opts }];
        }
        await getRepository(AliasEntity).save({ ...item, group: null });
        const response = prepare('alias.alias-group-unset', item);
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-list')) {
        const [group] = new Expects(opts.parameters)
          .argument({
            name: 'list', type: String, optional: true, multi: true, delimiter: '',
          }) // set as multi as group can contain spaces
          .toArray();
        if (group) {
          const aliases = await getRepository(AliasEntity).find({
            where: {
              visible: true, enabled: true, group,
            },
          });
          const response = prepare('alias.alias-group-list-aliases', { group, list: aliases.length > 0 ? aliases.map(o => o.alias).sort().join(', ') : `<${translate('core.empty')}>` });
          return [{ response, ...opts }];
        } else {
          const aliases = await getRepository(AliasEntity).find();
          const groups = [...new Set(aliases.map(o => o.group).filter(o => !!o).sort())];
          const response = prepare('alias.alias-group-list', { list: groups.length > 0 ? groups.join(', ') : `<${translate('core.empty')}>` });
          return [{ response, ...opts }];
        }
      } else if (opts.parameters.includes('-enable')) {
        const [group] = new Expects(opts.parameters)
          .argument({
            name: 'enable', type: String, multi: true, delimiter: '',
          }) // set as multi as group can contain spaces
          .toArray();
        await getRepository(AliasEntity).update({ group }, { enabled: true });
        const response = prepare('alias.alias-group-list-enabled', { group });
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-disable')) {
        const [group] = new Expects(opts.parameters)
          .argument({
            name: 'disable', type: String, multi: true, delimiter: '',
          }) // set as multi as group can contain spaces
          .toArray();
        await getRepository(AliasEntity).update({ group }, { enabled: false });
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
    cache.invalidate();
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

      const item = await getRepository(AliasEntity).findOne({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      await getRepository(AliasEntity).save({
        ...item, command: cmd, permission: pItem.id ?? defaultPermissions.VIEWERS,
      });

      const response = prepare('alias.alias-was-edited', { alias, command: cmd });
      return [{ response, ...opts }];
    } catch (e: any) {
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }
  }

  @command('!alias add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions) {
    cache.invalidate();
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

      const response = prepare('alias.alias-was-added',
        await getRepository(AliasEntity).save({
          alias,
          command:    cmd,
          enabled:    true,
          visible:    true,
          permission: pItem.id ?? defaultPermissions.VIEWERS,
        }),
      );
      return [{ response, ...opts }];
    } catch (e: any) {
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }
  }

  @command('!alias list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions) {
    cache.invalidate();
    const alias = await getRepository(AliasEntity).find({ visible: true, enabled: true });
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
    cache.invalidate();
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !');
      }

      const item = await getRepository(AliasEntity).findOne({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      await getRepository(AliasEntity).save({ ...item, enabled: !item.enabled });
      const response = prepare(!item.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', item);
      return [{ response, ...opts }];
    } catch (e: any) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }

  @command('!alias toggle-visibility')
  @default_permission(defaultPermissions.CASTERS)
  async toggleVisibility (opts: CommandOptions) {
    cache.invalidate();
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !');
      }

      const item = await getRepository(AliasEntity).findOne({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      await getRepository(AliasEntity).save({ ...item, visible: !item.visible });
      const response = prepare(!item.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', item);
      return [{ response, ...opts }];
    } catch (e: any) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }

  @command('!alias remove')
  @default_permission(defaultPermissions.CASTERS)
  async remove (opts: CommandOptions) {
    cache.invalidate();
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !');
      }

      const item = await getRepository(AliasEntity).findOne({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      await getRepository(AliasEntity).remove(item);
      const response = prepare('alias.alias-was-removed', { alias });
      return [{ response, ...opts }];
    } catch (e: any) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }
}

export default new Alias();
