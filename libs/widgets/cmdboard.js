'use strict'

var _ = require('lodash')

function CmdboardWidget () {
  this.commands = {}

  global.panel.addWidget('cmdboard', 'widget-title-cmdboard', 'th')

  global.panel.socketListening(this, 'cmdboard.widget.fetch', this.fetchCommands)
  global.panel.socketListening(this, 'cmdboard.widget.run', this.runCommand)
  global.panel.socketListening(this, 'cmdboard.widget.add', this.addCommand)
  global.panel.socketListening(this, 'cmdboard.widget.remove', this.removeCommand)

  this._update(this)
}

CmdboardWidget.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'cmdboard.widget' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: 'CmdboardWidget.prototype._update' })
    if (!_.isNull(item)) self.commands = item.commands
  })
}

CmdboardWidget.prototype._save = function (self) {
  var commands = { commands: self.commands }
  global.botDB.update({ _id: 'cmdboard.widget' }, { $set: commands }, { upsert: true })
}

CmdboardWidget.prototype.fetchCommands = function (self, socket) {
  socket.emit('cmdboard.widget.data', self.commands)
}

CmdboardWidget.prototype.runCommand = function (self, socket, data) {
  global.parser.parse({ username: global.parser.getOwner() }, self.commands[data], true)
}

CmdboardWidget.prototype.addCommand = function (self, socket, data) {
  self.commands[data.name] = data.command
  self._save(self)
  self.fetchCommands(self, socket)
}

CmdboardWidget.prototype.removeCommand = function (self, socket, data) {
  delete self.commands[data.name]
  self._save(self)
  self.fetchCommands(self, socket)
}

module.exports = new CmdboardWidget()
