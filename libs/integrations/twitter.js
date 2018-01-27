'use strict'

// 3rdparty libraries
const Client = require('twitter')
const debug = require('debug')
const _ = require('lodash')

const config = require('../../config.json')

function Twitter () {
  if (global.commons.isIntegrationEnabled(this)) {
    this.client = new Client({
      consumer_key: config.integrations.twitter.consumerKey,
      consumer_secret: config.integrations.twitter.consumerSecret,
      access_token_key: config.integrations.twitter.accessToken,
      access_token_secret: config.integrations.twitter.secretToken
    })

    global.events.supportedOperationsList.push(
      { id: 'send-twitter-message', definitions: { messageToSend: '' }, fire: this.fireSendTwitterMessage }
    )
    global.panel.addWidget('twitter', 'widget-title-twitter', 'twitter')
    global.panel.socketListening(this, 'twitter.send', this.send)
  }
}

Twitter.prototype.fireSendTwitterMessage = async function (operation, attributes) {
  const d = debug('events:fireSendTwitterMessage')

  attributes.username = _.get(attributes, 'username', global.parser.getOwner())
  let message = operation.messageToSend
  _.each(attributes, function (val, name) {
    if (_.isObject(val) && _.size(val) === 0) return true // skip empty object
    d(`Replacing $${name} with ${val}`)
    let replace = new RegExp(`\\$${name}`, 'g')
    message = message.replace(replace, val)
  })
  message = await global.parser.parseMessage(message)
  d('Tweeting message:', message)
  global.integrations.twitter.send(global.integrations.twitter, null, message)
}

Twitter.prototype.send = function (self, socket, text) {
  self.client.post('statuses/update', {status: text}, function (error, tweet, response) {
    if (error) global.log.error(error, 'Twitch#send')
  })
}

module.exports = new Twitter()
