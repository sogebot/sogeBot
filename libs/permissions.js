'use strict'

var constants = require('./constants')
var crypto = require('crypto')
var _ = require('lodash')

var log = global.log
var translate = global.translate

function Permissions () {
  global.parser.register(this, '!permission', this.overridePermission, constants.OWNER_ONLY)

  setInterval(function () {
    global.botDB.find({$where: function () { return this._id.startsWith('permission') }}, function (err, items) {
      if (err) { log.error(err) }
      _.each(items, function (item) {
        global.parser.permissionsCmds['!' + item.command] = item.permission
      })
    })
  }, 500)

  this.webPanel()
}

Permissions.prototype.webPanel = function () {
  global.panel.addMenu({category: 'settings', name: 'Permissions', id: 'permissions'})
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

Permissions.prototype.overridePermission = function (self, sender, text) {
  try {
    var parsed = text.match(/^(viewer|mods|owner|disable) ([\u0500-\u052F\u0400-\u04FF\w].+)$/)
    var hash = crypto.createHash('md5').update(parsed[2]).digest('hex')
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
      default:
        permission = constants.OWNER_ONLY
    }

    if (!_.isUndefined(global.parser.permissionsCmds['!' + command])) {
      global.parser.permissionsCmds['!' + command] = permission
      global.botDB.update({_id: 'permission_' + hash}, {$set: {command: command, permission: permission}}, {upsert: true}, function (err) {
        if (err) log.error(err)
        global.commons.sendMessage(translate('permissions.success.change').replace('(command)', parsed[1]), sender)
      })
    } else {
      global.commons.sendMessage(global.translate('permissions.failed.noCmd'), sender)
    }
  } catch (e) {
    global.commons.sendMessage(global.translate('permissions.failed.parse'), sender)
  }
}

module.exports = new Permissions()
