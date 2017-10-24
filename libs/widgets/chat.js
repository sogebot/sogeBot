'use strict'

const config = require('../../config.json')
const fetch = require('snekfetch')

function ChatWidget () {
  global.panel.addWidget('chat', 'widget-title-chat', 'comment')
  global.panel.socketListening(this, 'getChatRoom', this.sendChatRoom)
  global.panel.socketListening(this, 'chat.message.send', this.chatMessageSend)

  this.refresh()
  setInterval(() => this.refresh(), 30000)
}

ChatWidget.prototype.refresh = async (self, socket) => {
  let url = `https://tmi.twitch.tv/group/user/${config.settings.broadcaster_username.toLowerCase()}/chatters`
  let response = await fetch.get(url)

  if (response.status === 200) {
    global.panel.io.emit('chatChatters', { chatters: response.body.chatters, _total: response.body.chatter_count })
  }
}

ChatWidget.prototype.sendChatRoom = function (self, socket) {
  socket.emit('chatRoom', config.settings.broadcaster_username.toLowerCase())
}

ChatWidget.prototype.chatMessageSend = function (self, socket, message) {
  global.commons.sendMessage(message, { username: config.settings.bot_username }, { force: true })
}

module.exports = new ChatWidget()
