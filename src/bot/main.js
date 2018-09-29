/* @flow */

'use strict'
require('module-alias/register')

const figlet = require('figlet')
const cluster = require('cluster')
const os = require('os')
const util = require('util')
const _ = require('lodash')
const chalk = require('chalk')

const constants = require('./constants')
const config = require('@config')

global.commons = new (require('./commons'))()
global.cache = new (require('./cache'))()

global.linesParsed = 0
global.avgResponse = []

global.status = { // TODO: move it?
  'TMI': constants.DISCONNECTED,
  'API': constants.DISCONNECTED,
  'MOD': false,
  'RES': 0
}

require('./logging') // logger is on master / worker have own global.log sending data through process

const isNeDB = config.database.type === 'nedb'
if (cluster.isWorker) {
  global.db = new (require('./databases/database'))(isNeDB, isNeDB)
  require('./cluster.js')
} else if (cluster.isMaster) {
  global.db = new (require('./databases/database'))(!isNeDB, !isNeDB)
  // spin up forks first
  global.cpu = config.cpu === 'auto' ? os.cpus().length : parseInt(_.get(config, 'cpu', 1), 10)
  if (config.database.type === 'nedb') global.cpu = 1 // nedb can have only one fork
  for (let i = 0; i < global.cpu; i++) fork()
  cluster.on('disconnect', (worker) => fork())
  main()
}

async function main () {
  if (!global.db.engine.connected) return setTimeout(() => main(), 10)

  global.configuration = new (require('./configuration.js'))()
  global.currency = new (require('./currency.js'))()
  global.stats = new (require('./stats.js'))()
  global.users = new (require('./users.js'))()
  global.logger = new (require('./logging.js'))()

  global.events = new (require('./events.js'))()
  global.customvariables = new (require('./customvariables.js'))()

  global.panel = new (require('./panel'))()
  global.twitch = new (require('./twitch'))()
  global.permissions = new (require('./permissions'))()

  global.lib = {}
  global.lib.translate = new (require('./translate'))()
  global.translate = global.lib.translate.translate

  global.oauth = new (require('./oauth.js'))()
  global.webhooks = new (require('./webhooks'))()
  global.api = new (require('./api'))()

  // panel
  global.logger._panel()

  console.log(figlet.textSync('sogeBot ' + _.get(process, 'env.npm_package_version', 'x.y.z'), {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }))

  global.lib.translate._load().then(function () {
    global.systems = require('auto-load')('./dest/systems/')
    global.widgets = require('auto-load')('./dest/widgets/')
    global.overlays = require('auto-load')('./dest/overlays/')
    global.games = require('auto-load')('./dest/games/')
    global.integrations = require('auto-load')('./dest/integrations/')

    global.panel.expose()

    if (process.env.HEAP && process.env.HEAP.toLowerCase() === 'true') {
      global.log.warning(chalk.bgRed.bold('HEAP debugging is ENABLED'))
      setTimeout(() => require('./heapdump.js').init('heap/'), 120000)
    }

    global.tmi = new (require('./tmi'))()
  })
}

function fork () {
  let worker = cluster.fork()
  forkOn(worker)
}

function forkOn (worker) {
  if (!global.db.engine.connected || !(global.lib && global.lib.translate)) return setTimeout(() => forkOn(worker), 1000)
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
      global.commons.message('say', null, msg.message)
    } else if (msg.type === 'me') {
      global.commons.message('me', null, msg.message)
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

if (cluster.isMaster) {
  setInterval(() => {
    if (global.cpu > 1) { // refresh if there is more than one worker
      let worker = _.sample(cluster.workers)
      worker.send({ type: 'shutdown' })
      worker.disconnect()
    }
  }, 1000 * 60 * 60 * 2) // every 2 hour spin up new worker and kill old
}
