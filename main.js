'use strict'

const figlet = require('figlet')
const cluster = require('cluster')
const irc = require('twitch-js')
const os = require('os')
const util = require('util')
const debug = require('debug')
const _ = require('lodash')
const moment = require('moment')

const constants = require('./libs/constants')
const config = require('./config.json')
const Timeout = require('./libs/timeout')

const DEBUG_CLUSTER_FORK = debug('cluster:fork')
const DEBUG_CLUSTER_MASTER = debug('cluster:master')
const DEBUG_TMIJS = debug('tmijs')

// this is disabled in tests
global.cluster = _.isNil(global.cluster) ? true : global.cluster

global.commons = new (require('./libs/commons'))()
global.cache = new (require('./libs/cache'))()

global.linesParsed = 0
global.avgResponse = []

global.status = { // TODO: move it?
  'TMI': constants.DISCONNECTED,
  'API': constants.DISCONNECTED,
  'MOD': false,
  'RES': 0
}

require('./libs/logging') // logger is on master / worker have own global.log sending data through process

global.db = new (require('./libs/databases/database'))(global.cluster)
if (cluster.isMaster) {
  // spin up forks first
  global.cpu = config.cpu === 'auto' ? os.cpus().length : parseInt(_.get(config, 'cpu', 1), 10)
  if (config.database.type === 'nedb') global.cpu = 1 // nedb can have only one fork
  for (let i = 0; i < global.cpu; i++) fork()
  cluster.on('disconnect', (worker) => fork())
  main()
} else {
  require('./cluster.js')
}

function main () {
  if (!global.db.engine.connected) return setTimeout(() => main(), 10)

  global.configuration = new (require('./libs/configuration.js'))()
  global.currency = new (require('./libs/currency.js'))()
  global.stats = new (require('./libs/stats.js'))()
  global.users = new (require('./libs/users.js'))()
  global.logger = new (require('./libs/logging.js'))()

  global.events = new (require('./libs/events.js'))()
  global.customvariables = new (require('./libs/customvariables.js'))()

  global.panel = new (require('./libs/panel'))()
  global.webhooks = new (require('./libs/webhooks'))()
  global.api = new (require('./libs/api'))()
  global.twitch = new (require('./libs/twitch'))()
  global.permissions = new (require('./libs/permissions'))()

  global.lib = {}
  global.lib.translate = new (require('./libs/translate'))()
  global.translate = global.lib.translate.translate

  // panel
  global.logger._panel()

  console.log(figlet.textSync('sogeBot ' + _.get(process, 'env.npm_package_version', 'x.y.z'), {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }))

  // connect to tmis
  global.client = global.client || new irc.Client({
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

  global.lib.translate._load().then(function () {
    global.systems = require('auto-load')('./libs/systems/')
    global.widgets = require('auto-load')('./libs/widgets/')
    global.overlays = require('auto-load')('./libs/overlays/')
    global.games = require('auto-load')('./libs/games/')
    global.integrations = require('auto-load')('./libs/integrations/')

    global.panel.expose()

    global.client.connect()
    if (_.get(config, 'settings.broadcaster_oauth', '').match(/oauth:[\w]*/)) {
      global.broadcasterClient.connect()
    } else {
      global.log.error('Broadcaster oauth is not properly set - hosts will not be loaded')
      global.log.error('Broadcaster oauth is not properly set - subscribers will not be loaded')
    }

    loadClientListeners()

    setInterval(function () {
      global.status.MOD = global.client.isMod('#' + config.settings.broadcaster_username, config.settings.bot_username)
    }, 60000)
  })
}

function fork () {
  let worker = cluster.fork()
  DEBUG_CLUSTER_FORK(`New worker ${worker.id} was created.`)
  // processing messages from workers
  worker.on('message', async (msg) => {
    if (msg.type === 'lang') {
      for (let worker in cluster.workers) cluster.workers[worker].send({ type: 'lang' })
      await global.lib.translate._load()
    } else if (msg.type === 'call') {
      const namespace = _.get(global, msg.ns, null)
      namespace[msg.fnc].apply(namespace, msg.args)
    } else if (msg.type === 'log') {
      return global.log[msg.level](msg.message, msg.params)
    } else if (msg.type === 'stats') {
      let avgTime = 0
      global.avgResponse.push(msg.value)
      if (msg.value > 1000) global.log.warning(`Took ${msg.value}ms to process: ${msg.message}`)
      if (global.avgResponse.length > 100) global.avgResponse.shift()
      for (let time of global.avgResponse) avgTime += parseInt(time, 10)
      global.status['RES'] = (avgTime / global.avgResponse.length).toFixed(0)
    } else if (msg.type === 'say') {
      global.commons.message('say', config.settings.broadcaster_username, msg.message)
    } else if (msg.type === 'action') {
      global.commons.message('action', config.settings.broadcaster_username, msg.message)
    } else if (msg.type === 'whisper') {
      global.commons.message('whisper', msg.sender, msg.message)
    } else if (msg.type === 'parse') {
      _.sample(cluster.workers).send({ type: 'message', sender: msg.sender, message: msg.message, skip: true, quiet: msg.quiet }) // resend to random worker
    } else if (msg.type === 'db') {
      // do nothing on db
    } else if (msg.type === 'timeout') {
      global.commons.timeout(msg.username, msg.reason, msg.timeout)
    } else if (msg.type === 'api') {
      global.api[msg.fnc](msg.username, msg.id)
    } else if (msg.type === 'event') {
      global.events.fire(msg.eventId, msg.attributes)
    }
  })
}

function loadClientListeners (client) {
  global.client.on('connected', function (address, port) {
    DEBUG_TMIJS('Bot is connected to TMI server - %s:%s', address, port)
    global.log.info('Bot is connected to TMI server')
    global.client.color(config.settings.bot_color)
    global.status.TMI = constants.CONNECTED
  })

  global.client.on('connecting', function (address, port) {
    DEBUG_TMIJS('Bot is connecting to TMI server - %s:%s', address, port)
    global.log.info('Bot is connecting to TMI server')
    global.status.TMI = constants.CONNECTING
  })

  global.client.on('reconnect', function (address, port) {
    DEBUG_TMIJS('Bot is reconnecting to TMI server - %s:%s', address, port)
    global.log.info('Bot is trying to reconnect to TMI server')
    global.status.TMI = constants.RECONNECTING
  })

  global.client.on('message', async function (channel, sender, message, fromSelf) {
    DEBUG_TMIJS('Message received: %s\n\tuserstate: %s', message, JSON.stringify(sender))

    if (!fromSelf && config.settings.bot_username.toLowerCase() !== sender.username) {
      sendMessageToWorker(sender, message)
      global.linesParsed++
    }
  })

  global.client.on('mod', async function (channel, username) {
    DEBUG_TMIJS('User mod: %s', username)
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

  global.client.on('resub', async function (channel, username, months, message, userstate, method) {
    resub(channel, username, months, message, userstate, method)
  })

  global.broadcasterClient.on('connected', function (address, port) {
    DEBUG_TMIJS('Broadcaster is connected to TMI server - %s:%s', address, port)
    global.log.info('Broadcaster is connected to TMI server')
  })

  global.broadcasterClient.on('connecting', function (address, port) {
    DEBUG_TMIJS('Broadcaster is connecting to TMI server - %s:%s', address, port)
    global.log.info('Broadcaster is connecting to TMI server')
  })

  global.client.on('reconnect', function (address, port) {
    DEBUG_TMIJS('Bot is reconnecting to TMI server - %s:%s', address, port)
    global.log.info('Bot is trying to reconnect to TMI server')
    global.status.TMI = constants.RECONNECTING
  })

  global.client.on('disconnected', function (address, port) {
    DEBUG_TMIJS('Bot is disconnected to TMI server - %s:%s', address, port)
    global.log.warning('Bot is disconnected from TMI server')
    global.status.TMI = constants.DISCONNECTED
  })

  global.client.on('action', async function (channel, userstate, message, self) {
    DEBUG_TMIJS('User action: %s\n\tuserstate', message, JSON.stringify(userstate))

    let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: userstate.username })
    if (!_.isEmpty(ignoredUser) && userstate.username !== config.settings.broadcaster_username) return

    if (self) return

    global.events.fire('action', { username: userstate.username.toLowerCase() })
  })

  global.client.on('ban', function (channel, username, reason) {
    DEBUG_TMIJS('User ban: %s with reason %s', username, reason)
    global.log.ban(`${username}, reason: ${reason}`)
    global.events.fire('ban', { username: username.toLowerCase(), reason: reason })
  })

  global.client.on('timeout', function (channel, username, reason, duration) {
    DEBUG_TMIJS('User timeout: %s with reason %s for %ss', username, reason, duration)
    global.events.fire('timeout', { username: username.toLowerCase(), reason: reason, duration: duration })
  })

  global.client.on('raid', function (channel, raider, viewers, userstate) {
    DEBUG_TMIJS('Raided by %s with %s viewers', raider, viewers)
    global.log.raid(`${raider}, viewers: ${viewers}`)

    global.db.engine.update('cache.raids', { username: raider }, { username: raider })

    const data = {
      username: raider,
      viewers: viewers
    }

    data.type = 'raid'
    global.overlays.eventlist.add(data)
    global.events.fire('raided', data)
  })

  global.client.on('hosting', function (channel, target, viewers) {
    DEBUG_TMIJS('Hosting: %s with %s viewers', target, viewers)
    global.events.fire('hosting', { target: target, viewers: viewers })
  })

  global.client.on('ritual', function (channel, username, type, userstate) {
    if (type === 'new_chatter') {
      global.db.engine.increment('api.new', { key: 'chatters' }, { value: 1 })
    }
  })

  global.broadcasterClient.on('hosted', async (channel, username, viewers, autohost) => {
    DEBUG_TMIJS(`Hosted by ${username} with ${viewers} viewers - autohost: ${autohost}`)
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
}

if (cluster.isMaster) {
  process.on('unhandledRejection', function (reason, p) {
    global.log.error(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`)
  })

  process.on('uncaughtException', (error) => {
    if (_.isNil(global.log)) return console.log(error)
    global.log.error(util.inspect(error))
    global.log.error('+------------------------------------------------------------------------------+')
    global.log.error('| BOT HAS UNEXPECTEDLY CRASHED                                                 |')
    global.log.error('| PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue |')
    global.log.error('| AND ADD logs/exceptions.log file to your report                              |')
    global.log.error('+------------------------------------------------------------------------------+')
    process.exit(1)
  })
}

async function subscription (channel, username, method) {
  DEBUG_TMIJS('Subscription: %s from %j', username, method)

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
  if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

  global.users.set(username, { is: { subscriber: true }, time: { subscribed_at: _.now() }, stats: { tier: method.prime ? 'Prime' : method.plan / 1000 } })
  global.overlays.eventlist.add({ type: 'sub', tier: (method.prime ? 'Prime' : method.plan / 1000), username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
  global.log.sub(`${username}, tier: ${method.prime ? 'Prime' : method.plan / 1000}`)
  global.events.fire('subscription', { username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
}

async function resub (channel, username, months, message, userstate, method) {
  DEBUG_TMIJS('Resub: %s (%s months) - %s', username, months, message, userstate, method)

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
  if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

  global.users.set(username, { is: { subscriber: true }, time: { subscribed_at: moment().subtract(months, 'months').format('X') * 1000 }, stats: { tier: method.prime ? 'Prime' : method.plan / 1000 } })
  global.overlays.eventlist.add({ type: 'resub', tier: (method.prime ? 'Prime' : method.plan / 1000), username: username, monthsName: global.commons.getLocalizedName(months, 'core.months'), months: months, message: message })
  global.log.resub(`${username}, months: ${months}, message: ${message}, tier: ${method.prime ? 'Prime' : method.plan / 1000}`)
  global.events.fire('resub', { username: username, monthsName: global.commons.getLocalizedName(months, 'core.months'), months: months, message: message })
}

async function subgift (channel, username, recipient) {
  recipient = recipient.toLowerCase()
  DEBUG_TMIJS('Subgift: from %s to %s', username, recipient)

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: username })
  if (!_.isEmpty(ignoredUser) && username !== config.settings.broadcaster_username) return

  global.users.set(recipient, { is: { subscriber: true }, time: { subscribed_at: _.now() } })
  global.overlays.eventlist.add({ type: 'subgift', username: recipient, from: username })
  global.events.fire('subgift', { username: username, recipient: recipient })
  global.log.subgift(`${recipient}, from: ${username}`)
}

async function cheer (channel, userstate, message) {
  DEBUG_TMIJS('Cheer: %s\n\tuserstate: %s', message, JSON.stringify(userstate))

  // remove cheerX or channelCheerX from message
  message = message.replace(/(.*?[cC]heer[\d]+)/g, '').trim()

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: userstate.username })
  if (!_.isEmpty(ignoredUser) && userstate.username !== config.settings.broadcaster_username) return

  global.overlays.eventlist.add({ type: 'cheer', username: userstate.username.toLowerCase(), bits: userstate.bits, message: message })
  global.log.cheer(`${userstate.username.toLowerCase()}, bits: ${userstate.bits}, message: ${message}`)
  global.db.engine.insert('users.bits', { username: userstate.username.toLowerCase(), amount: userstate.bits, message: message, timestamp: _.now() })
  global.events.fire('cheer', { username: userstate.username.toLowerCase(), bits: userstate.bits, message: message })
  if (await global.cache.isOnline()) await global.db.engine.increment('api.current', { key: 'bits' }, { value: parseInt(userstate.bits, 10) })
}

let lastWorker = null
function sendMessageToWorker (sender, message) {
  let worker = _.sample(cluster.workers)

  if (worker.id === lastWorker && global.cpu > 1) {
    new Timeout().recursive({ uid: 'sendMessageToWorker', this: this, args: [sender, message], fnc: sendMessageToWorker, wait: 10 })
    return
  } else lastWorker = worker.id

  DEBUG_CLUSTER_MASTER(`Sending ${message} ${util.inspect(sender)} to worker#${worker.id} - is connected: ${worker.isConnected()}`)
  if (worker.isConnected()) worker.send({ type: 'message', sender: sender, message: message })
  else new Timeout().recursive({ uid: 'sendMessageToWorker', this: this, args: [sender, message], fnc: sendMessageToWorker, wait: 10 })
}

if (cluster.isMaster) {
  setInterval(() => {
    if (global.cpu > 1) { // refresh if there is more than one worker
      let worker = _.sample(cluster.workers)
      worker.send({ type: 'shutdown' })
      worker.disconnect()
    }
  }, 1000 * 60 * 60 * 2) // every 2 hour spin up new worker and kill old
}
