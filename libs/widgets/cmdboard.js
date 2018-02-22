'use strict'

var _ = require('lodash')

function CmdboardWidget () {
  global.panel.addWidget('cmdboard', 'widget-title-cmdboard', 'fas fa-th')

  global.panel.socketListening(this, 'cmdboard.widget.fetch', this.fetchCommands)
  global.panel.socketListening(this, 'cmdboard.widget.run', this.runCommand)
  global.panel.socketListening(this, 'cmdboard.widget.add', this.addCommand)
  global.panel.socketListening(this, 'cmdboard.widget.remove', this.removeCommand)
}

CmdboardWidget.prototype.fetchCommands = async function (self, socket) {
  socket.emit('cmdboard.widget.data', await global.db.engine.find('widgetsCmdBoard'))
}

CmdboardWidget.prototype.runCommand = async function (self, socket, data) {
  let commands = await global.db.engine.find('widgetsCmdBoard')
  global.parser.parse({ username: global.parser.getOwner() }, _.find(commands, (o) => o.text === data).command, true)
}

CmdboardWidget.prototype.addCommand = async function (self, socket, data) {
  await global.db.engine.insert('widgetsCmdBoard', { text: data.name, command: data.command })
  self.fetchCommands(self, socket)
}

CmdboardWidget.prototype.removeCommand = async function (self, socket, data) {
  await global.db.engine.remove('widgetsCmdBoard', { text: data.name })
  self.fetchCommands(self, socket)
}

module.exports = new CmdboardWidget()
