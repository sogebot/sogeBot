// @flow

'use strict'

// 3rdparty libraries
const Client = require('twitter')
const _ = require('lodash')
const chalk = require('chalk')
const cluster = require('cluster')

const Message = require('../message')

// bot libraries
const Integration = require('./_interface')

class Twitter extends Integration {
  client: any = null

  constructor () {
    const settings = {
      tokens: {
        consumerKey: '',
        consumerSecret: '',
        accessToken: '',
        secretToken: ''
      }
    }
    const ui = {
      tokens: {
        consumerKey: {
          type: 'text-input',
          secret: true
        },
        consumerSecret: {
          type: 'text-input',
          secret: true
        },
        accessToken: {
          type: 'text-input',
          secret: true
        },
        secretToken: {
          type: 'text-input',
          secret: true
        }
      }
    }

    const onChange = {
      enabled: ['onStateChange']
    }

    super({ settings, ui, onChange })

    if (cluster.isMaster) this.addEvent()
  }

  addEvent () {
    if (typeof global.events === 'undefined') setTimeout(() => this.addEvent(), 1000)
    else {
      global.events.supportedOperationsList.push(
        { id: 'send-twitter-message', definitions: { messageToSend: '' }, fire: this.fireSendTwitterMessage }
      )
    }
  }

  onStateChange (key: string, value: string) {
    if (value) this.connect()
    else this.disconnect()
  }

  disconnect () {
    this.client = null
    global.log.info(chalk.yellow('TWITTER: ') + 'Client disconnected from service')
  }

  connect () {
    try {
      let error = []
      if (this.settings.tokens.consumerKey.trim().length === 0) error.push('consumerKey')
      if (this.settings.tokens.consumerSecret.trim().length === 0) error.push('consumerSecret')
      if (this.settings.tokens.accessToken.trim().length === 0) error.push('accessToken')
      if (this.settings.tokens.secretToken.trim().length === 0) error.push('secretToken')
      if (error.length > 0) throw new Error(error.join(', ') + 'missing')

      this.client = new Client({
        consumer_key: this.settings.tokens.consumerKey,
        consumer_secret: this.settings.tokens.consumerSecret,
        access_token_key: this.settings.tokens.accessToken,
        access_token_secret: this.settings.tokens.secretToken
      })
      global.log.info(chalk.yellow('TWITTER: ') + 'Client connected to service')
    } catch (e) {
      global.log.info(chalk.yellow('TWITTER: ') + e.message)
    }
  }

  async fireSendTwitterMessage (operation: Object, attributes: Object) {
    attributes.username = _.get(attributes, 'username', global.commons.getOwner())
    let message = operation.messageToSend
    _.each(attributes, function (val, name) {
      if (_.isObject(val) && _.size(val) === 0) return true // skip empty object
      let replace = new RegExp(`\\$${name}`, 'g')
      message = message.replace(replace, val)
    })
    message = await new Message(message).parse()
    global.integrations.twitter.send(message)
  }

  send (text: string) {
    if (cluster.isWorker) {
      if (process.send) process.send({ type: 'call', ns: 'integrations.twitter', fnc: 'send', args: [text] })
      return
    }
    if (this.client === null) throw new Error('Twitter integration is not connected')
    this.client.post('statuses/update', { status: text }, function (error, tweet, response) {
      if (error) global.log.error(error, 'Twitch#send')
    })
  }
}

module.exports = new Twitter()
