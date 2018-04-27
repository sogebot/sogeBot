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
      {this: this, command: '!permission', fnc: this.override, permission: constants.OWNER_ONLY}
    ]
  }

  webPanel () {
    global.panel.addMenu({category: 'settings', name: 'permissions', id: 'permissions'})
    global.panel.socketListening(this, 'getPermissions', this.sendSocket)
    global.panel.socketListening(this, 'changePermission', this.changeSocket)
  }

  async sendSocket (self, socket) {
    let parser = new Parser()
    socket.emit('Permissions', await parser.getCommandsList())
  }

  async changeSocket (self, socket, data) {
    await self.override(self, null, data.permission + ' ' + data.command)
  }

  removePermission (self, command) {
    // command should be without !
    global.db.engine.remove('permissions', { key: command.replace('!', '') })
  }

  async override (self, sender, text) {
    try {
      const match = XRegExp.exec(text, constants.PERMISSION_REGEXP)
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

      let isFound = true
      if (!_.isNil(sender)) {
        // we've got this command from chat, need to recheck
        // if command exists
        let parser = new Parser()
        isFound = !_.isNil(await parser.find('!' + match.command))
      }

      if (isFound) {
        await global.db.engine.update('permissions', { key: match.command }, { key: match.command, permission: permission })
        global.commons.sendMessage(global.translate('permissions.success.change').replace(/\$command/g, match.command), sender)
      } else {
        global.commons.sendMessage(global.translate('permissions.failed.noCmd'), sender)
      }
    } catch (e) {
      global.commons.sendMessage(global.translate('permissions.failed.parse'), sender)
    }
  }
}

module.exports = Permissions
