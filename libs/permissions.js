'use strict'

var constants = require('./constants')
var _ = require('lodash')

function Permissions () {
  global.parser.register(this, '!permission', this.overridePermission, constants.OWNER_ONLY)

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
  self.overridePermission(self, null, data.permission + ' ' + data.command)
  self.sendSocket(self, socket)
}

Permissions.prototype.removePermission = function (self, command) {
  global.db.engine.remove('permissions', { key: command })
}

Permissions.prototype.overridePermission = function (self, sender, text) {
  try {
    var parsed = text.match(/^(viewer|mods|owner|regular|disable) ([\u0500-\u052F\u0400-\u04FF\w].*)$/)
    var command = parsed[2]
    var permission
    switch (parsed[1]) {
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

    if (!_.isUndefined(global.parser.permissionsCmds['!' + command])) {
      global.parser.permissionsCmds['!' + command] = permission
      global.db.engine.update('permissions', { key: command }, { key: command, permission: permission })
      global.commons.sendMessage(global.translate('permissions.success.change').replace(/\$command/g, parsed[1]), sender)
    } else {
      global.commons.sendMessage(global.translate('permissions.failed.noCmd'), sender)
    }
  } catch (e) {
    global.commons.sendMessage(global.translate('permissions.failed.parse'), sender)
  }
}

module.exports = Permissions
