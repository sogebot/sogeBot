'use strict'

// 3rdparty libraries
const Client = require('twitter')

const config = require('../../config.json')

function Twitter () {
  if (global.commons.isIntegrationEnabled(this)) {
    this.client = new Client({
      consumer_key: config.integrations.twitter.consumerKey,
      consumer_secret: config.integrations.twitter.consumerSecret,
      access_token_key: config.integrations.twitter.accessToken,
      access_token_secret: config.integrations.twitter.secretToken
    })

    console.warn('TODO: twitter events deprecated')
    /*
    this.addEvent(this)
    global.panel.addWidget('twitter', 'widget-title-twitter', 'twitter')
    global.panel.socketListening(this, 'twitter.send', this.send)
    */
  }
}

Twitter.prototype.addEvent = function (self) {
  global.events.operations['send-twitter-message'] = async function (attr) {
    // global variables
    let send = attr.send
      .replace(/\$game/g, global.twitch.current.game)
      .replace(/\$title/g, global.twitch.current.status)
      .replace(/\$viewers/g, global.twitch.current.viewers)
      .replace(/\$views/g, global.twitch.current.views)
      .replace(/\$followers/g, global.twitch.current.followers)
      .replace(/\$hosts/g, global.twitch.current.hosts)
      .replace(/\$subscribers/g, global.twitch.current.subscribers)
      .replace(/\$bits/g, global.twitch.current.bits)
    send = await global.parser.parseMessage(send, attr)
    self.send(self, null, send)
  }
}

Twitter.prototype.send = function (self, socket, text) {
  self.client.post('statuses/update', {status: text}, function (error, tweet, response) {
    if (error) global.log.error(error, 'Twitch#send')
  })
}

module.exports = new Twitter()
