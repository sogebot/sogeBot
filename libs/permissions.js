'use strict'

var constants = require('./constants')
var _ = require('lodash')
const XRegExp = require('xregexp')

function Permissions () {
  global.parser.register(this, '!permission', this.override, constants.OWNER_ONLY)

  global.configuration.register('disablePermissionWhispers', 'whisper.settings.disablePermissionWhispers', 'bool', true)

  setInterval(async function () {
    let permissions = await global.db.engine.find('permissions')
    _.each(permissions, function (permission) {
      global.parser.permissionsCmds['!' + permission.key] = permission.permission
    })
  }, 1000)

  this.webPanel()
}

Permissions.prototype.webPanel = function () {
  global.panel.addMenu({category: 'settings', name: 'permissions', id: 'permissions'})
  global.panel.socketListening(this, 'getPermissions', this.sendSocket)
  global.panel.socketListening(this, 'changePermission', this.changeSocket)
}

Permissions.prototype.sendSocket = function (self, socket) {
  socket.emit('Permissions', global.parser.permissionsCmds)
}

Permissions.prototype.changeSocket = function (self, socket, data) {
  self.override(self, null, data.permission + ' ' + data.command)
  self.sendSocket(self, socket)
}

Permissions.prototype.removePermission = function (self, command) {
  // command should be without !
  global.db.engine.remove('permissions', { key: command.replace('!', '') })
}

Permissions.prototype.override = function (self, sender, text) {
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

    if (!_.isUndefined(global.parser.permissionsCmds['!' + match.command])) {
      global.parser.permissionsCmds['!' + match.command] = permission
      global.db.engine.update('permissions', { key: match.command }, { key: match.command, permission: permission })
      global.commons.sendMessage(global.translate('permissions.success.change').replace(/\$command/g, match.command), sender)
    } else {
      global.commons.sendMessage(global.translate('permissions.failed.noCmd'), sender)
    }
  } catch (e) {
    global.commons.sendMessage(global.translate('permissions.failed.parse'), sender)
  }
}

module.exports = Permissions
