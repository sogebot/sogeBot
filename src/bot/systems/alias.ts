'use strict';

import * as _ from 'lodash';

import { prepare, sendMessage } from '../commons';
import { command, default_permission, parser } from '../decorators';
import Expects from '../expects';
import Message from '../message';
import * as Parser from '../parser';
import { permission } from '../permissions';
import System from './_interface';
import { incrementCountOfCommandUsage } from '../helpers/commands/count';


/*
 * !alias                                              - gets an info about alias usage
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

    this.addMenu({ category: 'manage', name: 'alias', id: 'alias/list' });
    this.addMenu({ category: 'settings', name: 'systems', id: 'systems' });
  }

  @parser()
  async run (opts) {
    const p = new Parser.default();
    let alias;

    // is it an command?
    if (!opts.message.startsWith('!')) {return true;}

    let cmdArray = opts.message.toLowerCase().split(' ');
    let length = opts.message.toLowerCase().split(' ').length;
    for (let i = 0; i < length; i++) {
      alias = await global.db.engine.findOne(this.collection.data, { alias: cmdArray.join(' '), enabled: true });
      if (!_.isEmpty(alias)) {break;}
      cmdArray.pop(); // remove last array item if not found
    }
    if (_.isEmpty(alias)) {return true;} // no alias was found - return

    let replace = new RegExp(`${alias.alias}`, 'i');
    cmdArray = opts.message.replace(replace, `${alias.command}`).split(' ');
    let tryingToBypass = false;

    for (let i = 0; i < length; i++) { // search for correct alias
      if (cmdArray.length === alias.command.split(' ').length) {break;} // command is correct (have same number of parameters as command)

      const parsedCmd = await p.find(cmdArray.join(' '));
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
        global.log.warning(`Cannot run alias ${alias.alias}, because it exec ${alias.command}`);
        return false;
      } else if ((await global.permissions.check(opts.sender.userId, alias.permission)).access) {
        // parse variables
        const message = await new Message(opts.message.replace(replace, `${alias.command}`)).parse({
          sender: opts.sender
        });
        global.log.process({ type: 'parse', sender: opts.sender, message });
        global.tmi.message({
          message: {
            tags: opts.sender,
            message,
          }, skip: true });
        incrementCountOfCommandUsage(alias.alias);
      } else {
        return false;
      }
    }
    return true;
  }

  @command('!alias')
  @default_permission(permission.CASTERS)
  main (opts) {
    sendMessage(global.translate('core.usage') + ': !alias add -p [uuid|name] <!alias> <!command> | !alias edit -p [uuid|name] <!alias> <!command> | !alias remove <!alias> | !alias list | !alias toggle <!alias> | !alias toggle-visibility <!alias>', opts.sender, opts.attr);
  }

  @command('!alias edit')
  @default_permission(permission.CASTERS)
  async edit (opts) {
    try {
      const [perm, alias, command] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ name: 'a', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
        .argument({ name: 'c', type: String, multi: true, delimiter: '' }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !command.startsWith('!')) {
        throw Error('Alias or Command doesn\'t start with !');
      }

      const pItem: Permissions.Item | null = await global.permissions.get(perm);
      if (!pItem) {
        throw Error('Permission ' + perm + ' not found.');
      }

      const item = await global.db.engine.findOne(this.collection.data, { alias });
      if (_.isEmpty(item)) {
        let message = await prepare('alias.alias-was-not-found', { alias });
        sendMessage(message, opts.sender, opts.attr);
        return false;
      }
      await global.db.engine.update(this.collection.data, { alias }, { command, permission: pItem.id });

      let message = await prepare('alias.alias-was-edited', { alias, command });
      sendMessage(message, opts.sender, opts.attr);
    } catch (e) {
      sendMessage(prepare('alias.alias-parse-failed'), opts.sender, opts.attr);
    }
  }

  @command('!alias add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    try {
      const [perm, alias, command] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ name: 'a', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
        .argument({ name: 'c', type: String, multi: true, delimiter: '' }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !command.startsWith('!')) {
        throw Error('Alias or Command doesn\'t start with !');
      }

      const pItem: Permissions.Item | null = await global.permissions.get(perm);
      if (!pItem) {
        throw Error('Permission ' + perm + ' not found.');
      }

      const aliasObj = {
        alias,
        command,
        enabled: true,
        visible: true,
        permission: pItem.id
      };
      await global.db.engine.insert(this.collection.data, aliasObj);
      let message = await prepare('alias.alias-was-added', aliasObj);
      sendMessage(message, opts.sender, opts.attr);
    } catch (e) {
      sendMessage(prepare('alias.alias-parse-failed'), opts.sender, opts.attr);
    }
  }

  @command('!alias list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    let alias = await global.db.engine.find(this.collection.data, { visible: true, enabled: true });
    var output = (alias.length === 0 ? global.translate('alias.list-is-empty') : global.translate('alias.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(alias, 'alias'), 'alias')).join(', ')));
    sendMessage(output, opts.sender, opts.attr);
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

      const item = await global.db.engine.findOne(this.collection.data, { alias });
      if (_.isEmpty(item)) {
        let message = await prepare('alias.alias-was-not-found', { alias });
        sendMessage(message, opts.sender, opts.attr);
        return;
      }

      await global.db.engine.update(this.collection.data, { alias }, { enabled: !item.enabled });
      let message = await prepare(!item.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', item);
      sendMessage(message, opts.sender, opts.attr);
    } catch (e) {
      let message = await prepare('alias.alias-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
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

      const item = await global.db.engine.findOne(this.collection.data, { alias });
      if (_.isEmpty(item)) {
        let message = await prepare('alias.alias-was-not-found', { alias });
        sendMessage(message, opts.sender, opts.attr);
        return false;
      }

      await global.db.engine.update(this.collection.data, { alias }, { visible: !item.visible });
      let message = await prepare(!item.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', item);
      sendMessage(message, opts.sender, opts.attr);
    } catch (e) {
      let message = await prepare('alias.alias-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
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

      let removed = await global.db.engine.remove(this.collection.data, { alias });
      if (!removed) {
        let message = await prepare('alias.alias-was-not-found', { alias });
        sendMessage(message, opts.sender, opts.attr);
        return false;
      }

      let message = await prepare('alias.alias-was-removed', { alias });
      sendMessage(message, opts.sender, opts.attr);
    } catch (e) {
      let message = await prepare('alias.alias-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
    }
  }
}

export default Alias;
export { Alias };
