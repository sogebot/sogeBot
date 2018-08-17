'use strict'

var constants = require('./constants')
var _ = require('lodash')
const XRegExp = require('xregexp')
const Parser = require('./parser')

class Permissions {
  constructor () {
    global.configuration.register('disablePermissionWhispers', 'whisper.settings.disablePermissionWhispers', 'bool', true)

    if (require('cluster').isMaster) {
      this.webPanel()
    }
  }

  commands () {
    return [
      {this: this, id: '!permission', command: '!permission', fnc: this.override, permission: constants.OWNER_ONLY}
    ]
  }

  webPanel () {
    global.panel.addMenu({category: 'settings', name: 'permissions', id: 'permissions'})
    global.panel.socketListening(this, 'getPermissions', this.sendSocket)
    global.panel.socketListening(this, 'changePermission', this.changeSocket)
  }

  async sendSocket (self, socket) {
    let parser = new Parser()
    const commands = await parser.getCommandsList()

    let toEmit = []
    for (let command of commands) {
      toEmit.push({
        id: command.id,
        command: command.command,
        permission: command.permission
      })
    }
    socket.emit('Permissions', _.orderBy(toEmit, o => o.command))
  }

  async changeSocket (self, socket, data) {
    switch (data.permission) {
      case 'viewer':
        data.permission = constants.VIEWERS
        break
      case 'mods':
        data.permission = constants.MODS
        break
      case 'disable':
        data.permission = constants.DISABLE
        break
      case 'regular':
        data.permission = constants.REGULAR
        break
      default:
        data.permission = constants.OWNER_ONLY
    }
    await global.db.engine.update('permissions', { key: data.id }, { key: data.id, permission: data.permission })
  }

  removePermission (self, command) {
    global.db.engine.remove('permissions', { key: command })
  }

  async override (opts) {
    try {
      const match = XRegExp.exec(opts.parameters, constants.PERMISSION_REGEXP)
      var permission
      switch (match.type) {
        case 'viewer':
          permission = constants.VIEWERS
          break
        case 'mods':
          permission = constants.MODS
          break
        case 'disable':
          permission = constants.DISABLE
          break
        case 'regular':
          permission = constants.REGULAR
          break
        default:
          permission = constants.OWNER_ONLY
      }

      let parser = new Parser()
      let command = await parser.find('!' + match.command)

      if (command) {
        if (!_.isNil(command.id)) await global.db.engine.update('permissions', { key: command.id }, { key: command.id, permission: permission })
        // deprecated saving on match.command
        else await global.db.engine.update('permissions', { key: command.command }, { key: command.command, permission: permission })
        global.commons.sendMessage(global.translate('permissions.success.change').replace(/\$command/g, command.command), opts.sender)
      } else {
        global.commons.sendMessage(global.translate('permissions.failed.noCmd'), opts.sender)
      }
    } catch (e) {
      global.commons.sendMessage(global.translate('permissions.failed.parse'), opts.sender)
    }
  }
}

module.exports = Permissions
