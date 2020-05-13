'use strict';

import * as _ from 'lodash';

import { parserReply, prepare } from '../commons';
import { command, default_permission, parser } from '../decorators';
import Expects from '../expects';
import Parser from '../parser';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { incrementCountOfCommandUsage } from '../helpers/commands/count';
import { debug, error, warning } from '../helpers/log';

import { Alias as AliasEntity, AliasInterface } from '../database/entity/alias';
import { getRepository } from 'typeorm';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { addToViewersCache, getFromViewersCache } from '../helpers/permissions';
import permissions from '../permissions';
import { translate } from '../translate';
import customvariables from '../customvariables';

/*
 * !alias                                              - gets an info about alias usage
 * !alias group -set [group] -a ![alias]               - add alias to group
 * !alias group -unset ![alias]                     - unset alias from group
 * !alias group -list                                  - list alias groups
 * !alias group -list [group]                          - list alias group by name
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

    this.addMenu({ category: 'manage', name: 'alias', id: 'manage/alias' });
  }

  sockets() {
    publicEndpoint(this.nsp, 'alias:getAll', async (cb) => {
      try {
        cb(null, await getRepository(AliasEntity).find());
      } catch (e) {
        cb(e.stack, []);
      }
    });

    adminEndpoint(this.nsp, 'getById', async (id, cb) => {
      try {
        cb(null, await getRepository(AliasEntity).findOne({ id }));
      } catch (e) {
        cb(e.stack);
      }
    });

    adminEndpoint(this.nsp, 'setById', async (id, dataset: AliasInterface, cb) => {
      try {
        const item = await getRepository(AliasEntity).save({ ...(await getRepository(AliasEntity).findOne({ id })), ...dataset});
        cb(null, item);
      } catch (e) {
        cb(e.stack, null);
      }
    });

    adminEndpoint(this.nsp, 'deleteById', async (id, cb) => {
      await getRepository(AliasEntity).delete({ id });
      cb(null);
    });
  }

  @parser()
  async run (opts: ParserOptions): Promise<boolean> {
    const p = new Parser();
    let alias;

    // is it an command?
    if (!opts.message.startsWith('!')) {
      return true;
    }

    let cmdArray = opts.message.toLowerCase().split(' ');
    const length = opts.message.toLowerCase().split(' ').length;
    for (let i = 0; i < length; i++) {
      alias = await getRepository(AliasEntity).findOne({ alias: cmdArray.join(' '), enabled: true });
      if (!_.isEmpty(alias)) {
        break;
      }
      cmdArray.pop(); // remove last array item if not found
    }
    if (_.isEmpty(alias)) {
      return true;
    } // no alias was found - return

    const replace = new RegExp(`${alias.alias}`, 'i');
    cmdArray = opts.message.replace(replace, `${alias.command}`).split(' ');
    let tryingToBypass = false;

    for (let i = 0; i < length; i++) { // search for correct alias
      if (cmdArray.length === alias.command.split(' ').length) {
        break;
      } // command is correct (have same number of parameters as command)

      const parsedCmd = await p.find(cmdArray.join(' '), null);
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
          addToViewersCache(opts.sender.userId, alias.permission, (await permissions.check(opts.sender.userId, alias.permission, false)).access);
        }
        if (getFromViewersCache(opts.sender.userId, alias.permission)) {
          // process custom variables
          const response = await customvariables.executeVariablesInText(opts.message.replace(replace, alias.command));
          debug('alias.process', response);
          const responses = await p.command(opts.sender, response, true);
          debug('alias.process', responses);
          responses.forEach(r => {
            parserReply(r.response, { sender: r.sender, attr: r.attr });
          });
          incrementCountOfCommandUsage(alias.alias);
        } else {
          return false;
        }
      }
    }
    return true;
  }

  @command('!alias')
  @default_permission(permission.CASTERS)
  main (opts): CommandResponse[] {
    let url = 'http://sogehige.github.io/sogeBot/#/systems/alias';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogehige.github.io/sogeBot/#/_master/systems/alias';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!alias group')
  @default_permission(permission.CASTERS)
  async group (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (opts.parameters.includes('-set')) {
        const [alias, group] = new Expects(opts.parameters)
          .argument({ name: 'a', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
          .argument({ name: 'set', type: String, multi: true, delimiter: '' }) // set as multi as group can contain spaces
          .toArray();
        const item = await getRepository(AliasEntity).findOne({ alias });
        if (!item) {
          const response = prepare('alias.alias-was-not-found', { alias });
          return [{ response, ...opts }];
        }
        await getRepository(AliasEntity).save({...item, group });
        const response = prepare('alias.alias-group-set', {...item, group });
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-unset')) {
        const [alias] = new Expects(opts.parameters)
          .argument({ name: 'unset', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
          .toArray();
        const item = await getRepository(AliasEntity).findOne({ alias });
        if (!item) {
          const response = prepare('alias.alias-was-not-found', { alias });
          return [{ response, ...opts }];
        }
        await getRepository(AliasEntity).save({...item, group: null });
        const response = prepare('alias.alias-group-unset', item);
        return [{ response, ...opts }];
      } else if (opts.parameters.includes('-list')) {
        const [group] = new Expects(opts.parameters)
          .argument({ name: 'list', type: String, optional: true, multi: true, delimiter: '' }) // set as multi as group can contain spaces
          .toArray();
        if (group) {
          const aliases = await getRepository(AliasEntity).find({ where: { visible: true, enabled: true, group } });
          const response = prepare('alias.alias-group-list-aliases', {
            group, list: aliases.length > 0 ? aliases.map(o => o.alias).sort().join(', ') : `<${translate('core.empty')}>`,
          });
          return [{ response, ...opts }];
        } else {
          const aliases = await getRepository(AliasEntity).find();
          const groups = [...new Set(aliases.map(o => o.group).filter(o => !!o).sort())];
          const response = prepare('alias.alias-group-list', {
            list: groups.length > 0 ? groups.join(', ') : `<${translate('core.empty')}>` });
          return [{ response, ...opts }];
        }
      } else {
        throw new Error('-set, -unset or -list not found in command.');
      }
    } catch (e) {
      error(e.message);
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }

  }

  @command('!alias edit')
  @default_permission(permission.CASTERS)
  async edit (opts) {
    try {
      const [perm, alias, cmd] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ name: 'a', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
        .argument({ name: 'c', type: String, multi: true, delimiter: '' }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !(cmd.startsWith('!') || cmd.startsWith('$_'))) {
        throw Error('Alias/Command doesn\'t start with ! or command is not custom variable');
      }

      const pItem = await permissions.get(perm);
      if (!pItem) {
        throw Error('Permission ' + perm + ' not found.');
      }

      const item = await getRepository(AliasEntity).findOne({ alias });
      if (!item) {
        const response = prepare('alias.alias-was-not-found', { alias });
        return [{ response, ...opts }];
      }
      await getRepository(AliasEntity).save({...item, command: cmd, permission: pItem.id ?? permission.VIEWERS});

      const response = prepare('alias.alias-was-edited', { alias, command: cmd });
      return [{ response, ...opts }];
    } catch (e) {
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }
  }

  @command('!alias add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    try {
      const [perm, alias, cmd] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ name: 'a', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
        .argument({ name: 'c', type: String, multi: true, delimiter: '' }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !(cmd.startsWith('!') || cmd.startsWith('$_'))) {
        throw Error('Alias/Command doesn\'t start with ! or command is not custom variable');
      }

      const pItem = await permissions.get(perm);
      if (!pItem) {
        throw Error('Permission ' + perm + ' not found.');
      }

      const response = prepare('alias.alias-was-added',
        await getRepository(AliasEntity).save({
          alias,
          command: cmd,
          enabled: true,
          visible: true,
          permission: pItem.id ?? permission.VIEWERS,
        })
      );
      return [{ response, ...opts }];
    } catch (e) {
      return [{ response: prepare('alias.alias-parse-failed'), ...opts }];
    }
  }

  @command('!alias list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    const alias = await getRepository(AliasEntity).find({ visible: true, enabled: true });
    const response = (alias.length === 0 ? translate('alias.list-is-empty') : translate('alias.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(alias, 'alias'), 'alias')).join(', ')));
    return [{ response, ...opts }];
  }

  @command('!alias toggle')
  @default_permission(permission.CASTERS)
  async toggle (opts) {
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
      await getRepository(AliasEntity).save({...item, enabled: !item.enabled});
      const response = prepare(!item.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', item);
      return [{ response, ...opts }];
    } catch (e) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }

  @command('!alias toggle-visibility')
  @default_permission(permission.CASTERS)
  async toggleVisibility (opts) {
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
      await getRepository(AliasEntity).save({...item, visible: !item.visible});
      const response = prepare(!item.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', item);
      return [{ response, ...opts }];
    } catch (e) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }

  @command('!alias remove')
  @default_permission(permission.CASTERS)
  async remove (opts) {
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
    } catch (e) {
      const response = prepare('alias.alias-parse-failed');
      return [{ response, ...opts }];
    }
  }
}

export default new Alias();
