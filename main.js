'use strict'

// 3rd party libraries
var irc = require('twitch-js')
var _ = require('lodash')
const figlet = require('figlet')
const moment = require('moment')

// config
const config = require('./config.json')

// logger
const Logger = require('./libs/logging')
global.logger = new Logger()

// db
const Database = require('./libs/databases/database')
global.db = new Database()

// debug
const debug = require('debug')('tmijs')

// bot libraries
var Configuration = require('./libs/configuration')
var Translate = require('./libs/translate')
var Parser = require('./libs/parser')
var Twitch = require('./libs/twitch')
var Commons = require('./libs/commons')
var Users = require('./libs/users')
var Panel = require('./libs/panel')
var Stats = require('./libs/stats')
var Watcher = require('./libs/watcher')
var Events = require('./libs/events')
var Permissions = require('./libs/permissions')
var constants = require('./libs/constants')
var Webhooks = require('./libs/webhooks')

console.log(figlet.textSync('sogeBot ' + _.get(process, 'env.npm_package_version', 'x.y.z'), {
  font: 'ANSI Shadow',
  horizontalLayout: 'default',
  verticalLayout: 'default'
}))

global.client = new irc.Client({
  connection: {
    reconnect: true
  },
  identity: {
    username: config.settings.bot_username,
    password: config.settings.bot_oauth
  },
  channels: ['#' + config.settings.broadcaster_username]
})

global.broadcasterClient = new irc.Client({
  connection: {
    reconnect: true
  },
  identity: {
    username: config.settings.broadcaster_username,
    password: config.settings.broadcaster_oauth
  },
  channels: ['#' + config.settings.broadcaster_username]
})

main()

function main () {
  if (!global.db.engine.connected) {
    setTimeout(() => main(), 10)
    return
  }

  global.watcher = new Watcher()
  global.parser = new Parser()
  global.configuration = new Configuration()
  global.commons = new Commons()
  global.panel = new Panel()
  global.users = new Users()
  global.twitch = new Twitch()
  global.stats = new Stats()
  global.events = new Events()
  global.permissions = new Permissions()
  global.webhooks = new Webhooks()

  global.lib = {}
  global.lib.translate = new Translate()
  global.translate = global.lib.translate.translate

  // panel
  global.logger._panel()

  global.status = {
    'TMI': constants.DISCONNECTED,
    'API': constants.DISCONNECTED,
    'MOD': false
  }

  global.channelId = null

  global.lib.translate._load().then(function () {
    global.systems = require('auto-load')('./libs/systems/')
    global.integrations = require('auto-load')('./libs/integrations/')
    global.games = require('auto-load')('./libs/games/')
    global.widgets = require('auto-load')('./libs/widgets/')
    global.overlays = require('auto-load')('./libs/overlays/')
  })

  global.client.on('connected', function (address, port) {
    debug('Bot is connected to TMI server - %s:%s', address, port)
    global.log.info('Bot is connected to TMI server')
    global.client.color(config.settings.bot_color)
    global.status.TMI = constants.CONNECTED
  })

  global.client.on('connecting', function (address, port) {
    debug('Bot is connecting to TMI server - %s:%s', address, port)
    global.log.info('Bot is connecting to TMI server')
    global.status.TMI = constants.CONNECTING
  })

  global.broadcasterClient.on('connected', function (address, port) {
    debug('Broadcaster is connected to TMI server - %s:%s', address, port)
    global.log.info('Broadcaster is connected to TMI server')
  })

  global.broadcasterClient.on('connecting', function (address, port) {
    debug('Broadcaster is connecting to TMI server - %s:%s', address, port)
    global.log.info('Broadcaster is connecting to TMI server')
  })

  global.client.on('reconnect', function (address, port) {
    if (debug.enabled) debug('Bot is reconnecting to TMI server - %s:%s', address, port)
    global.log.info('Bot is trying to reconnect to TMI server')
    global.status.TMI = constants.RECONNECTING
  })

  global.client.on('disconnected', function (address, port) {
    if (debug.enabled) debug('Bot is disconnected to TMI server - %s:%s', address, port)
    global.log.warning('Bot is disconnected from TMI server')
    global.status.TMI = constants.DISCONNECTED
  })

  global.client.on('message', async function (channel, sender, message, fromSelf) {
    if (debug.enabled) debug('Message received: %s\n\tuserstate: %s', message, JSON.stringify(sender))

    if (!fromSelf && config.settings.bot_username !== sender.username) {
      // check moderation and skip if moderated
      if (!global.parser.isModerated(sender, message)) return

      global.users.set(sender.username, { id: sender['user-id'], is: { online: true, subscriber: _.get(sender, 'subscriber', false) } })
      // unset tier if not subscriber
      if (!_.get(sender, 'subscriber', false)) global.db.engine.update('users', { username: sender.username }, { stats: { tier: 0 } })

      // isUserIgnored
      let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: _.get(sender, 'username', '') })
      let isUserIgnored = !_.isEmpty(ignoredUser) && _.get(sender, 'username', '') !== config.settings.broadcaster_username

      if (sender['message-type'] !== 'whisper') {
        global.parser.timer.push({ 'id': sender.id, 'received': new Date().getTime() })
        global.parser.parse(sender, message, false, isUserIgnored)
        let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: sender.username })
        if (!_.isEmpty(ignoredUser) && sender.username !== config.settings.broadcaster_username) return

        global.log.chatIn(message, {username: sender.username})
        global.events.fire('command-send-x-times', { username: sender.username, message: message })

        const user = await global.users.get(sender.username)
        if (!_.isNil(user.id)) global.users.isFollower(user.username)
        if (!message.startsWith('!')) global.db.engine.increment('users', { username: user.username }, { stats: { messages: 1 } })

        // set is.mod
        global.users.set(user.username, { is: { mod: sender.mod } })
      } else {
        global.log.whisperIn(message, {username: sender.username})
        if (!global.configuration.getValue('disableWhisperListener') || global.parser.isOwner(sender)) global.parser.parse(sender, message)
      }
    }
  })

  global.client.on('join', async function (channel, username, fromSelf) {
    if (debug.enabled) debug('User joined: %s (isBot: %s)', username, fromSelf)

    let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
    if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

    if (!fromSelf) {
      let user = await global.users.get(username)
      if (!_.isNil(user) && !_.isNil(user.id)) {
        global.users.isFollower(username)
      }
      global.users.set(username, { is: { online: true } })
      global.widgets.joinpart.send({ username: username, type: 'join' })
      global.events.fire('user-joined-channel', { username: username })
    }
  })

  global.client.on('part', async function (channel, username, fromSelf) {
    if (debug.enabled) debug('User parted: %s (isBot: %s)', username, fromSelf)

    let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
    if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

    if (!fromSelf) {
      global.users.set(username, { is: { online: false } })
      global.widgets.joinpart.send({ username: username, type: 'part' })
      global.events.fire('user-parted-channel', { username: username })
    }
  })

  global.client.on('action', async function (channel, userstate, message, self) {
    if (debug.enabled) debug('User action: %s\n\tuserstate', message, JSON.stringify(userstate))

    let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: userstate.username })
    if (!_.isEmpty(ignoredUser) && userstate.username !== config.settings.broadcaster_username) return

    if (self) return

    global.events.fire('action', { username: userstate.username.toLowerCase() })
  })

  global.client.on('ban', function (channel, username, reason) {
    if (debug.enabled) debug('User ban: %s with reason %s', username, reason)
    global.log.ban(`${username}, reason: ${reason}`)
    global.events.fire('ban', { username: username.toLowerCase(), reason: reason })
  })

  global.client.on('timeout', function (channel, username, reason, duration) {
    if (debug.enabled) debug('User timeout: %s with reason %s for %ss', username, reason, duration)
    global.log.timeout(`username: ${username.toLowerCase()}, reason: ${reason}, duration: ${duration}`)
    global.events.fire('timeout', { username: username.toLowerCase(), reason: reason, duration: duration })
  })

  global.client.on('hosting', function (channel, target, viewers) {
    if (debug.enabled) debug('Hosting: %s with %s viewers', target, viewers)
    global.events.fire('hosting', { target: target, viewers: viewers })
  })

  global.broadcasterClient.on('hosted', async (channel, username, viewers, autohost) => {
    debug(`Hosted by ${username} with ${viewers} viewers - autohost: ${autohost}`)
    global.log.host(`${username}, viewers: ${viewers}, autohost: ${autohost}`)

    global.db.engine.update('cache.hosts', { username: username }, { username: username })

    const data = {
      username: username,
      viewers: viewers,
      autohost: autohost
    }

    data.type = 'host'
    global.overlays.eventlist.add(data)
    global.events.fire('hosted', data)
  })

  global.client.on('mod', async function (channel, username) {
    if (debug.enabled) debug('User mod: %s', username)
    const user = await global.users.get(username)
    if (!user.is.mod) global.events.fire('mod', { username: username })
    global.users.set(username, { is: { mod: true } })
  })

  global.client.on('cheer', async function (channel, userstate, message) {
    cheer(channel, userstate, message)
  })

  global.client.on('subgift', async function (channel, username, recipient) {
    subgift(channel, username, recipient)
  })

  global.client.on('clearchat', function (channel) {
    global.events.fire('clearchat')
  })

  global.client.on('subscription', async function (channel, username, method) {
    subscription(channel, username, method)
  })

  global.client.on('resub', async function (channel, username, months, message) {
    resub(channel, username, months, message)
  })

  // Bot is checking if it is a mod
  setInterval(function () {
    global.status.MOD = global.client.isMod('#' + config.settings.broadcaster_username, config.settings.bot_username)
  }, 60000)

  // get and save channel_id
  const getChannelID = function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/users?login=' + config.settings.broadcaster_username,
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': config.settings.client_id
      }
    }, function (err, res, body) {
      if (err) {
        global.log.error(err)
        setTimeout(() => getChannelID(), 1000)
        return
      }

      if (_.isNil(body.users[0])) {
        global.log.error('Channel ' + config.settings.broadcaster_username + ' not found!')
        process.exit()
      } else {
        global.channelId = body.users[0]._id
        global.log.info('Broadcaster channel ID set to ' + global.channelId)
      }
    })
  }
  getChannelID()
}

async function subscription (channel, username, method) {
  if (debug.enabled) debug('Subscription: %s from %j', username, method)

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
  if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

  global.users.set(username, { is: { subscriber: true }, time: { subscribed_at: _.now() }, stats: { tier: method.prime ? 'Prime' : method.plan / 1000 } })
  global.overlays.eventlist.add({ type: 'sub', tier: (method.prime ? 'Prime' : method.plan / 1000), username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
  global.log.sub(`${username}, method: ${method}`)
  global.events.fire('subscription', { username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
}

async function resub (channel, username, months, message) {
  if (debug.enabled) debug('Resub: %s (%s months) - %s', username, months, message)

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
  if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

  let user = await global.db.engine.findOne('users', { username: username })
  global.users.set(username, { is: { subscriber: true }, time: { subscribed_at: moment().subtract(months, 'months').format('X') * 1000 } })
  global.overlays.eventlist.add({ type: 'resub', tier: user.tier, username: username, monthsName: global.parser.getLocalizedName(months, 'core.months'), months: months, message: message })
  global.log.resub(`${username}, months: ${months}, message: ${message}`)
  global.events.fire('resub', { username: username, monthsName: global.parser.getLocalizedName(months, 'core.months'), months: months, message: message })
}

async function subgift (channel, username, recipient) {
  recipient = recipient.toLowerCase()
  if (debug.enabled) debug('Subgift: from %s to %s', username, recipient)

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
  if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

  global.users.set(recipient, { is: { subscriber: true }, time: { subscribed_at: _.now() } })
  global.overlays.eventlist.add({ type: 'subgift', username: recipient, from: username })
  global.events.fire('subgift', { username: username, recipient: recipient })
  global.log.subgift(`${recipient}, from: ${username}`)
}

async function cheer (channel, userstate, message) {
  if (debug.enabled) debug('Cheer: %s\n\tuserstate: %s', message, JSON.stringify(userstate))

  // remove cheerX or channelCheerX from message
  message = message.replace(/(.*?[cC]heer[\d]+)/g, '').trim()

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: userstate.username })
  if (!_.isEmpty(ignoredUser) && userstate.username !== config.settings.broadcaster_username) return

  global.overlays.eventlist.add({ type: 'cheer', username: userstate.username.toLowerCase(), bits: userstate.bits, message: message })
  global.log.cheer(`${userstate.username.toLowerCase()}, bits: ${userstate.bits}, message: ${message}`)
  global.db.engine.increment('users', { username: userstate.username.toLowerCase() }, { stats: { bits: parseInt(userstate.bits, 10) } })
  global.events.fire('cheer', { username: userstate.username.toLowerCase(), bits: userstate.bits, message: message })
  if (global.twitch.isOnline) global.twitch.current.bits = global.twitch.current.bits + parseInt(userstate.bits, 10)
}

if (config.debug.all) {
  global.log.warning('+------------------------------------+')
  global.log.warning('| DEBUG MODE IS ENABLED              |')
  global.log.warning('| PLEASE DISABLE IT IN CONFIG.INI    |')
  global.log.warning('| UNLESS YOU KNOW WHAT YOU ARE DOING |')
  global.log.warning('+------------------------------------+')
}

process.on('unhandledRejection', function (reason, p) {
  global.log.error('Possibly Unhandled Rejection')
  global.log.error(p)
})

exports = module.exports = global
