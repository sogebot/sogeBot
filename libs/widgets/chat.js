'use strict'

const config = require('../../config.json')

function ChatWidget () {
  global.panel.addWidget('chat', 'widget-title-chat', 'comment')
  global.panel.socketListening(this, 'getChatRoom', this.sendChatRoom)
  global.panel.socketListening(this, 'chat.message.send', this.chatMessageSend)
}

ChatWidget.prototype.sendChatRoom = function (self, socket) {
  socket.emit('chatRoom', config.settings.broadcaster_username.toLowerCase())
}

ChatWidget.prototype.chatMessageSend = function (self, socket, message) {
  global.commons.sendMessage(message, { username: config.settings.bot_username }, { force: true })
}

module.exports = new ChatWidget()
