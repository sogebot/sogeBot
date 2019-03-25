'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
const Parser = require('../parser')
const commons = require('../commons')
const Message = require('../message')
import { getOwner, prepare, sendMessage } from '../commons';
import Expects from '../expects';
import System from './_interface'
import { permission } from '../permissions';

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
    const settings = {
      commands: [
        { name: '!alias add', permission: permission.CASTERS },
        { name: '!alias edit', permission: permission.CASTERS },
        { name: '!alias list', permission: permission.CASTERS },
        { name: '!alias remove', permission: permission.CASTERS },
        { name: '!alias toggle-visibility', permission: permission.CASTERS },
        { name: '!alias toggle', permission: permission.CASTERS },
        { name: '!alias', permission: permission.CASTERS }
      ],
      parsers: [
        { name: 'run', fireAndForget: true }
      ]
    }
    super({ settings })

    this.addMenu({ category: 'manage', name: 'alias', id: 'alias/list' })
    this.addMenu({ category: 'settings', name: 'systems', id: 'systems' })
  }

  async run (opts) {
    const parser = new Parser()
    let alias

    // is it an command?
    if (!opts.message.startsWith('!')) return true

    let cmdArray = opts.message.toLowerCase().split(' ')
    let length = opts.message.toLowerCase().split(' ').length
    for (let i = 0; i < length; i++) {
      alias = await global.db.engine.findOne(this.collection.data, { alias: cmdArray.join(' '), enabled: true })
      if (!_.isEmpty(alias)) break
      cmdArray.pop() // remove last array item if not found
    }
    if (_.isEmpty(alias)) return true // no alias was found - return

    let replace = new RegExp(`${alias.alias}`, 'i')
    cmdArray = opts.message.replace(replace, `${alias.command}`).split(' ')
    let tryingToBypass = false

    for (let i = 0; i < length; i++) { // search for correct alias
      if (cmdArray.length === alias.command.split(' ').length) break // command is correct (have same number of parameters as command)

      const parsedCmd = await parser.find(cmdArray.join(' '))
      const isRegistered = !_.isNil(parsedCmd) && parsedCmd.command.split(' ').length === cmdArray.length

      if (isRegistered) {
        tryingToBypass = true
        break
      }
      cmdArray.pop() // remove last array item if not found
    }
    if (!tryingToBypass) {
      // Don't run alias if its same as command e.g. alias !me -> command !me
      if (alias.command === alias.alias) {
        global.log.warning(`Cannot run alias ${alias.alias}, because it exec ${alias.command}`)
      } else if ((await global.permissions.check(opts.sender.userId, alias.permission)).access) {
        // parse variables
        const message = await new Message(opts.message.replace(replace, `${alias.command}`)).parse({
          sender: opts.sender
        });
        global.log.process({ type: 'parse', sender: opts.sender, message })
        global.tmi.message({
          message: {
            tags: opts.sender,
            message,
          }, skip: true })
      }
    }
    return true
  }

  main (opts) {
    sendMessage(global.translate('core.usage') + ': !alias add -p [uuid|name] <!alias> <!command> | !alias edit -p [uuid|name] <!alias> <!command> | !alias remove <!alias> | !alias list | !alias toggle <!alias> | !alias toggle-visibility <!alias>', opts.sender)
  }

  async edit (opts) {
    try {
      const [perm, alias, command] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ name: 'a', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
        .argument({ name: 'c', type: String, multi: true, delimiter: '' }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !command.startsWith('!')) {
        throw Error('Alias or Command doesn\'t start with !')
      }

      const pItem: Permissions.Item | null = await global.permissions.get(perm);
      if (!pItem) {
        throw Error('Permission ' + perm + ' not found.');
      }

      const item = await global.db.engine.findOne(this.collection.data, { alias })
      if (_.isEmpty(item)) {
        let message = await prepare('alias.alias-was-not-found', { alias })
        sendMessage(message, opts.sender)
        return false
      }
      await global.db.engine.update(this.collection.data, { alias }, { command, permission: pItem.id })

      let message = await prepare('alias.alias-was-edited', { alias, command })
      sendMessage(message, opts.sender)
    } catch (e) {
      sendMessage(prepare('alias.alias-parse-failed'), opts.sender)
    }
  }

  async add (opts) {
    try {
      const [perm, alias, command] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ name: 'a', type: String, multi: true, delimiter: '' }) // set as multi as alias can contain spaces
        .argument({ name: 'c', type: String, multi: true, delimiter: '' }) // set as multi as command can contain spaces
        .toArray();

      if (!alias.startsWith('!') || !command.startsWith('!')) {
        throw Error('Alias or Command doesn\'t start with !')
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
      }
      await global.db.engine.insert(this.collection.data, aliasObj)
      let message = await prepare('alias.alias-was-added', aliasObj)
      sendMessage(message, opts.sender)
    } catch (e) {
      sendMessage(prepare('alias.alias-parse-failed'), opts.sender)
    }
  }

  async list (opts) {
    let alias = await global.db.engine.find(this.collection.data, { visible: true, enabled: true })
    var output = (alias.length === 0 ? global.translate('alias.list-is-empty') : global.translate('alias.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(alias, 'alias'), 'alias')).join(', ')))
    sendMessage(output, opts.sender)
  }

  async toggle (opts) {
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray()

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !')
      }

      const item = await global.db.engine.findOne(this.collection.data, { alias })
      if (_.isEmpty(item)) {
        let message = await prepare('alias.alias-was-not-found', { alias })
        sendMessage(message, opts.sender)
        return
      }

      await global.db.engine.update(this.collection.data, { alias }, { enabled: !item.enabled })
      let message = await prepare(!item.enabled ? 'alias.alias-was-enabled' : 'alias.alias-was-disabled', item)
      sendMessage(message, opts.sender)
    } catch (e) {
      let message = await prepare('alias.alias-parse-failed')
      sendMessage(message, opts.sender)
    }
  }

  async toggleVisibility (opts) {
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray()

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !')
      }

      const item = await global.db.engine.findOne(this.collection.data, { alias })
      if (_.isEmpty(item)) {
        let message = await prepare('alias.alias-was-not-found', { alias })
        sendMessage(message, opts.sender)
        return false
      }

      await global.db.engine.update(this.collection.data, { alias }, { visible: !item.visible })
      let message = await prepare(!item.visible ? 'alias.alias-was-exposed' : 'alias.alias-was-concealed', item)
      sendMessage(message, opts.sender)
    } catch (e) {
      let message = await prepare('alias.alias-parse-failed')
      sendMessage(message, opts.sender)
    }
  }

  async remove (opts) {
    try {
      const [alias] = new Expects(opts.parameters)
        .everything()
        .toArray()

      if (!alias.startsWith('!')) {
        throw Error('Not starting with !')
      }

      let removed = await global.db.engine.remove(this.collection.data, { alias })
      if (!removed) {
        let message = await prepare('alias.alias-was-not-found', { alias })
        sendMessage(message, opts.sender)
        return false
      }

      let message = await prepare('alias.alias-was-removed', { alias })
      sendMessage(message, opts.sender)
    } catch (e) {
      let message = await prepare('alias.alias-parse-failed')
      sendMessage(message, opts.sender)
    }
  }
}

module.exports = new Alias()
