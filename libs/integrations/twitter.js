'use strict'

// 3rdparty libraries
const Client = require('twitter')

function Twitter () {
  if (global.commons.isIntegrationEnabled(this)) {
    this.client = new Client({
      consumer_key: global.configuration.get().twitter.consumerKey,
      consumer_secret: global.configuration.get().twitter.consumerSecret,
      access_token_key: global.configuration.get().twitter.accessToken,
      access_token_secret: global.configuration.get().twitter.secretToken
    })

    this.addEvent(this)
    global.panel.addWidget('twitter', 'widget-title-twitter', 'pencil')
    global.panel.socketListening(this, 'twitter.send', this.send)
  }
}

Twitter.prototype.addEvent = function (self) {
  global.events.operations['send-twitter-message'] = async function (attr) {
    self.send(self, null, attr.send)
  }
}

Twitter.prototype.send = function (self, socket, text) {
  self.client.post('statuses/update', {status: text}, function (error, tweet, response) {
    if (error) global.log.error(error, 'Twitch#send')
  })
}

module.exports = new Twitter()
