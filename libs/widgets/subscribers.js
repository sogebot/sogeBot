'use strict'

function SubscribersWidget () {
  global.configuration.register('subscribersWidgetShow', 'core.no-response', 'number', 5)
  global.configuration.register('subscribersWidgetFontSize', 'core.no-response', 'number', 20)

  global.panel.addWidget('subscribers', 'widget-title-latest-subscribers', 'user')
  global.panel.socketListening(this, 'subscribers.latest.get', this.emitLatestSubscribers)
  global.panel.socketListening(this, 'subscribers.configuration.get', this.sendConfiguration)
}

SubscribersWidget.prototype.sendConfiguration = function (self, socket) {
  socket.emit('subscribers.configuration', {
    subscribersWidgetShow: global.configuration.getValue('subscribersWidgetShow'),
    subscribersWidgetFontSize: global.configuration.getValue('subscribersWidgetFontSize')
  })
}

SubscribersWidget.prototype.emitLatestSubscribers = async function (self, socket) {
  const cached = await global.twitch.cached()
  socket.emit('subscribers.latest', cached.subscribers)
}

module.exports = new SubscribersWidget()
