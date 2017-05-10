'use strict'

function ChatWidget () {
  global.panel.addWidget('chat', 'widget-title-chat', 'comment')
  global.panel.socketListening(this, 'getChatRoom', this.sendChatRoom)
  global.panel.socketListening(this, 'chat.message.send', this.chatMessageSend)
}

ChatWidget.prototype.sendChatRoom = function (self, socket) {
  socket.emit('chatRoom', global.configuration.get().twitch.channel.toLowerCase())
}

ChatWidget.prototype.chatMessageSend = function (self, socket, message) {
  global.commons.sendMessage(message, { username: global.configuration.get().twitch.username }, { force: true })
}

module.exports = new ChatWidget()
