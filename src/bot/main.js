/* @flow */

'use strict'
require('module-alias/register')

const figlet = require('figlet')
const os = require('os')
const util = require('util')
const _ = require('lodash')
const chalk = require('chalk')
const gitCommitInfo = require('git-commit-info');

const {
  Worker, MessageChannel, MessagePort, isMainThread,
} = require('worker_threads');

const constants = require('./constants')
const config = require('@config')

global.commons = new (require('./commons'))()
global.cache = new (require('./cache'))()
global.workers = new (require('./workers'))

global.startedClusters = 0
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
global.cpu = config.threads === 'auto' ? os.cpus().length : parseInt(_.get(config, 'cpu', 1), 10)
if (config.database.type === 'nedb') global.cpu = 1 // nedb can have only one fork

if (!isMainThread) {
  global.db = new (require('./databases/database'))(isNeDB, isNeDB)
  require('./cluster.js')
} else {
  global.db = new (require('./databases/database'))(!isNeDB, !isNeDB)
  // spin up forks first

  for (let i = 0; i < global.cpu; i++) {
    global.workers.newWorker();
  }
  main()
}

async function main () {
  if (!global.db.engine.connected || global.cpu !== global.workers.onlineCount) return setTimeout(() => main(), 10)

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

  const version = _.get(process, 'env.npm_package_version', 'x.y.z')
  console.log(figlet.textSync('sogeBot ' + version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'), {
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

if (isMainThread) {
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
