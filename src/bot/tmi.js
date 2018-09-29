// @flow

'use strict'

const moment = require('moment')
const cluster = require('cluster')
const _ = require('lodash')
const TwitchJs = require('twitch-js').default

const Core = require('./_interface')
const constants = require('./constants')

class TMI extends Core {
  timeouts: Object = {}
  client: Object = {}
  lastWorker: string = ''
  broadcasterWarning: bool = false

  ignoreGiftsFromUser: { [string]: { count: number, time: Date }} = {}

  constructor () {
    super()

    if (cluster.isMaster) {
      global.status.TMI = constants.DISCONNECTED
      this.initClient('broadcaster')
      this.initClient('bot')
    }
  }

  async initClient (type: string) {
    clearTimeout(this.timeouts[`initClient.${type}`])
    const [token, username, channel] = await Promise.all([
      global.oauth.settings[type].accessToken,
      global.oauth.settings[type].username,
      global.oauth.settings.general.channel
    ])

    try {
      if (token === '' || username === '' || channel === '') throw Error(`${type} - token, username or channel expected`)
      this.client[type] = new TwitchJs({
        token,
        username,
        onAuthenticationFailure: () => global.oauth.refreshAccessToken(type).then(token => token)
      })
      this.loadListeners(type)
      await this.client[type].chat.connect()
      await this.client[type].chat.join(channel)
    } catch (e) {
      if (type === 'broadcaster' && !this.broadcasterWarning) {
        global.log.error('Broadcaster oauth is not properly set - hosts will not be loaded')
        global.log.error('Broadcaster oauth is not properly set - subscribers will not be loaded')
        this.broadcasterWarning = true
      }
      this.timeouts[`initClient.${type}`] = setTimeout(() => this.initClient(type), 10000)
    }
  }

  async reconnect (type: string) {
    if (typeof this.client[type] !== 'undefined') {
      global.log.info(`TMI: ${type} is reconnecting caused by scope or oauth change`)
      this.client[type].chat.disconnect()
    }
    this.initClient(type)
  }

  loadListeners (type: string) {
    // common for bot and broadcaster
    this.client[type].chat.on('DISCONNECT', async (message) => {
      global.log.info(`TMI: ${type} is disconnected`)
      global.status.TMI = constants.DISCONNECTED
    })
    this.client[type].chat.on('RECONNECT', async (message) => {
      global.log.info(`TMI: ${type} is reconnecting`)
      global.status.TMI = constants.RECONNECTING
    })
    this.client[type].chat.on('CONNECTED', async (message) => {
      global.log.info(`TMI: ${type} is connected`)
      global.status.TMI = constants.CONNECTED
    })

    if (type === 'bot') {
      this.client[type].chat.on('WHISPER', async (message) => {
        if (!await global.commons.isBot(message.tags.displayName) || !message.isSelf) {
          message.tags.username = message.tags.displayName.toLowerCase() // backward compatibility until userID is primary key
          message.tags['message-type'] = 'whisper'
          this.sendMessageToWorker(message.tags, message.message)
          global.linesParsed++
        }
      })

      this.client[type].chat.on('PRIVMSG', async (message) => {
        if (!await global.commons.isBot(message.tags.displayName) || !message.isSelf) {
          message.tags.username = message.tags.displayName.toLowerCase() // backward compatibility until userID is primary key
          message.tags['message-type'] = message.message.startsWith('\u0001ACTION') ? 'action' : 'say' // backward compatibility for /me moderation

          if (message.event === 'CHEER') {
            this.cheer(message.tags, message.message)
          } else {
            // strip message from ACTION
            message.message = message.message.replace('\u0001ACTION ', '').replace('\u0001', '')

            this.sendMessageToWorker(message.tags, message.message)
            global.linesParsed++

            if (message.tags['message-type'] === 'action') global.events.fire('action', { username: message.tags.username.toLowerCase() })
          }
        }
      })

      this.client[type].chat.on('CLEARCHAT', message => {
        if (message.event === 'USER_BANNED') {
          const duration = message.tags.banDuration
          const reason = message.tags.banReason
          const username = message.username.toLowerCase()

          if (typeof duration === 'undefined') {
            global.log.ban(`${username}, reason: ${reason}`)
            global.events.fire('ban', { username: username, reason: reason })
          } else {
            global.events.fire('timeout', { username, reason, duration })
          }
        } else {
          global.events.fire('clearchat')
        }
      })

      this.client[type].chat.on('HOSTTARGET', message => {
        if (message.event === 'HOST_ON') {
          if (typeof message.numberOfViewers !== 'undefined') { // may occur on restart bot when hosting
            global.events.fire('hosting', { target: message.username, viewers: message.numberOfViewers })
          }
        }
      })

      this.client[type].chat.on('MODE', async (message) => {
        const user = await global.users.getByName(message.username)
        if (!user.is.mod && message.isModerator) global.events.fire('mod', { username: message.username })
        if (!user.id) { user.id = await global.users.getIdFromTwitch(message.username) }
        global.users.set(message.username, { id: user.id, is: { mod: message.isModerator } })

        if (message.username === global.commons.cached.bot) global.status.MOD = message.isModerator
      })

      this.client[type].chat.on('USERNOTICE', message => {
        if (message.event === 'RAID') {
          global.log.raid(`${message.parameters.login}, viewers: ${message.parameters.viewerCount}`)
          global.db.engine.update('cache.raids', { username: message.parameters.login }, { username: message.parameters.login })

          const data = {
            username: message.parameters.login,
            viewers: message.parameters.viewerCount,
            type: 'raid'
          }

          global.overlays.eventlist.add(data)
          global.events.fire('raided', data)
        } else if (message.event === 'SUBSCRIPTION') {
          const method = {
            plan: message.parameters.subPlan === 'Prime' ? 1000 : message.parameters.subPlan,
            prime: message.parameters.subPlan === 'Prime' ? 'Prime' : false
          }
          this.subscription(message.tags.displayName.toLowerCase(), message.tags, method)
        } else if (message.event === 'RESUBSCRIPTION') {
          message.tags.username = message.tags.displayName.toLowerCase()
          const method = {
            plan: message.parameters.subPlan === 'Prime' ? 1000 : message.parameters.subPlan,
            prime: message.parameters.subPlan === 'Prime' ? 'Prime' : false
          }
          this.resub(message.tags.username, Number(message.parameters.months), message.message, message.tags, method)
        } else if (message.event === 'SUBSCRIPTION_GIFT') {
          this.subgift(message.tags.displayName.toLowerCase(), Number(message.parameters.months), message.parameters.recipientName)
        } else if (message.event === 'SUBSCRIPTION_GIFT_COMMUNITY') {
          this.subscriptionGiftCommunity(message.tags.displayName.toLowerCase(), Number(message.parameters.senderCount), Number(message.parameters.subPlan))
        } else if (message.event === 'RITUAL') {
          if (message.parameters.ritualName === 'new_chatter') {
            if (!global.users.newChattersList.includes(message.tags.displayName.toLowerCase())) {
              global.users.newChattersList.push(message.tags.displayName.toLowerCase())
              global.db.engine.increment('api.new', { key: 'chatters' }, { value: 1 })
            }
          } else {
            global.log.info('Unknown RITUAL')
          }
        } else {
          global.log.info('Unknown USERNOTICE')
          global.log.info(JSON.stringify(message))
        }
      })

      this.client[type].chat.on('NOTICE', message => {
        global.log.info(message.message)
      })
    } else if (type === 'broadcaster') {
      this.client[type].chat.on('PRIVMSG/HOSTED', async (message) => {
        // Someone is hosting the channel and the message contains how many viewers..
        const username = message.message.split(' ')[0].replace(':', '').toLowerCase()
        const autohost = message.message.includes('auto')
        let viewers = message.numberOfViewers || '0'

        global.log.host(`${username}, viewers: ${viewers}, autohost: ${autohost}`)
        global.db.engine.update('cache.hosts', { username }, { username })

        const data = {
          username: username,
          viewers: viewers,
          autohost: autohost,
          type: 'host'
        }

        global.overlays.eventlist.add(data)
        global.events.fire('hosted', data)
      })
    } else {
      throw Error(`This ${type} is not supported`)
    }
  }

  sendMessageToWorker (sender: Object, message: string) {
    clearTimeout(this.timeouts['sendMessageToWorker'])
    let worker = _.sample(cluster.workers)

    if (worker.id === this.lastWorker && global.cpu > 1) {
      this.timeouts['sendMessageToWorker'] = setTimeout(() => this.sendMessageToWorker(sender, message), 100)
      return
    } else this.lastWorker = worker.id

    if (worker.isConnected()) worker.send({ type: 'message', sender: sender, message: message })
    else this.timeouts['sendMessageToWorker'] = setTimeout(() => this.sendMessageToWorker(sender, message), 100)
  }

  async subscription (username: string, userstate: Object, method: Object) {
    if (await global.commons.isIgnored(username)) return

    const user = await global.db.engine.findOne('users', { id: userstate.userId })
    let subscribedAt = _.now()
    let isSubscriber = true

    if (user.lock && user.lock.subcribed_at) subscribedAt = undefined
    if (user.lock && user.lock.subscriber) isSubscriber = undefined

    global.users.setById(userstate.userId, { username, is: { subscriber: isSubscriber }, time: { subscribed_at: subscribedAt }, stats: { tier: method.prime ? 'Prime' : method.plan / 1000 } })
    global.overlays.eventlist.add({ type: 'sub', tier: (method.prime ? 'Prime' : method.plan / 1000), username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
    global.log.sub(`${username}, tier: ${method.prime ? 'Prime' : method.plan / 1000}`)
    global.events.fire('subscription', { username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
  }

  async resub (username: string, months: number, message: string, userstate: Object, method: Object) {
    if (await global.commons.isIgnored(username)) return

    const user = await global.db.engine.findOne('users', { id: userstate.userId })
    let subscribedAt = Number(moment().subtract(months, 'months').format('X')) * 1000
    let isSubscriber = true

    if (user.lock && user.lock.subcribed_at) subscribedAt = undefined
    if (user.lock && user.lock.subscriber) isSubscriber = undefined

    global.users.setById(userstate.userId, { username, id: userstate.userId, is: { subscriber: isSubscriber }, time: { subscribed_at: subscribedAt }, stats: { tier: method.prime ? 'Prime' : method.plan / 1000 } })
    global.overlays.eventlist.add({ type: 'resub', tier: (method.prime ? 'Prime' : method.plan / 1000), username: username, monthsName: global.commons.getLocalizedName(months, 'core.months'), months: months, message: message })
    global.log.resub(`${username}, months: ${months}, message: ${message}, tier: ${method.prime ? 'Prime' : method.plan / 1000}`)
    global.events.fire('resub', { username: username, monthsName: global.commons.getLocalizedName(months, 'core.months'), months: months, message: message })
  }

  async subscriptionGiftCommunity (username: string, count: number, plan: string | number) {
    this.ignoreGiftsFromUser[username] = { count, time: new Date() }

    if (await global.commons.isIgnored(username)) return

    global.overlays.eventlist.add({ type: 'subcommunitygift', username, count })
    global.events.fire('subcommunitygift', { username, count })
    global.log.subcommunitygift(`${username}, to ${count} viewers`)
  }

  async subgift (username: string, months: number, recipient: string) {
    recipient = recipient.toLowerCase()
    for (let [u, o] of Object.entries(this.ignoreGiftsFromUser)) {
      // $FlowFixMe Incorrect mixed type from value of Object.entries https://github.com/facebook/flow/issues/5838
      if (o.count === 0 || new Date().getTime() - new Date(o.time).getTime() >= 1000 * 60 * 10) {
        delete this.ignoreGiftsFromUser[u]
      }
    }

    if (typeof this.ignoreGiftsFromUser[username] !== 'undefined' && this.ignoreGiftsFromUser[username].count !== 0) {
      this.ignoreGiftsFromUser[username].count--
    } else {
      global.events.fire('subgift', { username: username, recipient: recipient })
    }
    if (await global.commons.isIgnored(username)) return

    let user = await global.db.engine.findOne('users', { username: recipient })
    if (!user.id) {
      user.id = await global.users.getIdFromTwitch(recipient)
    }

    if (user.id !== null) {
      let subscribedAt = _.now()
      let isSubscriber = true

      if (user.lock && user.lock.subcribed_at) subscribedAt = undefined
      if (user.lock && user.lock.subscriber) isSubscriber = undefined

      global.users.setById(user.id, { username: recipient, is: { subscriber: isSubscriber }, time: { subscribed_at: subscribedAt } })
      global.overlays.eventlist.add({ type: 'subgift', username: recipient, from: username, monthsName: global.commons.getLocalizedName(months, 'core.months'), months })
      global.log.subgift(`${recipient}, from: ${username}, months: ${months}`)
    }
  }

  async cheer (userstate: Object, message: string) {
    // remove cheerX or channelCheerX from message
    message = message.replace(/(.*?[cC]heer[\d]+)/g, '').trim()

    if (await global.commons.isIgnored(userstate.username)) return

    global.overlays.eventlist.add({ type: 'cheer', username: userstate.username.toLowerCase(), bits: userstate.bits, message: message })
    global.log.cheer(`${userstate.username.toLowerCase()}, bits: ${userstate.bits}, message: ${message}`)
    global.db.engine.insert('users.bits', { id: await global.users.getIdByName(userstate.username.toLowerCase()), amount: userstate.bits, message: message, timestamp: _.now() })
    global.events.fire('cheer', { username: userstate.username.toLowerCase(), bits: userstate.bits, message: message })
    if (await global.cache.isOnline()) await global.db.engine.increment('api.current', { key: 'bits' }, { value: parseInt(userstate.bits, 10) })
  }
}

module.exports = TMI
