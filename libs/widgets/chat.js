'use strict'

var _ = require('lodash')
var constants = require('../constants')

function ChatWidget () {
  global.panel.addWidget('chat', 'Twitch Chat', 'comment')
  global.parser.registerParser(this, 'messages', this.sendMessage, constants.VIEWERS)
  global.panel.socketListening(this, 'getChatRoom', this.sendChatRoom)
}

ChatWidget.prototype.sendChatRoom = function (self, socket) {
  socket.emit('chatRoom', global.configuration.get().twitch.owner.toLowerCase())
}

ChatWidget.prototype.sendMessage = function (self, id, sender, text) {
  global.panel.io.emit('chatMessage', {username: sender.username, message: text})
}

module.exports = new ChatWidget()
