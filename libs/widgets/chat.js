'use strict'

function ChatWidget () {
  global.panel.addWidget('chat', 'Twitch Chat', 'comment')
  global.panel.socketListening(this, 'getChatRoom', this.sendChatRoom)
}

ChatWidget.prototype.sendChatRoom = function (self, socket) {
  socket.emit('chatRoom', global.configuration.get().twitch.channel.toLowerCase())
}

module.exports = new ChatWidget()
