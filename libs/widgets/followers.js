'use strict'

function FollowersWidget () {
  global.configuration.register('followersWidgetShow', 'core.no-response', 'number', 5)
  global.configuration.register('followersWidgetFontSize', 'core.no-response', 'number', 20)

  global.panel.addWidget('followers', 'widget-title-latest-followers', 'user')
  global.panel.socketListening(this, 'followers.latest.get', this.emitLatestFollowers)
  global.panel.socketListening(this, 'followers.configuration.get', this.sendConfiguration)
}

FollowersWidget.prototype.sendConfiguration = function (self, socket) {
  socket.emit('followers.configuration', {
    followersWidgetShow: global.configuration.getValue('followersWidgetShow'),
    followersWidgetFontSize: global.configuration.getValue('followersWidgetFontSize')
  })
}

FollowersWidget.prototype.emitLatestFollowers = async function (self, socket) {
  const cached = await global.twitch.cached()
  socket.emit('followers.latest', cached.followers)
}

module.exports = new FollowersWidget()
