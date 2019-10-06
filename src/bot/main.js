if (Number(process.versions.node.split('.')[0]) < 11) {
  console.log('Upgrade your version of NodeJs! You need at least NodeJs 11.0.0, https://nodejs.org/en/. Current version is ' + process.versions.node)
  process.exit(1)
}

import { Workers } from './workers';
import { Permissions } from './permissions';
import { Events } from './events';
import { OAuth } from './oauth';
import { Currency } from './currency';
import { error, info, warning } from './helpers/log';

const figlet = require('figlet')
const os = require('os')
const util = require('util')
const _ = require('lodash')
const chalk = require('chalk')
const gitCommitInfo = require('git-commit-info');
const { isMainThread, } = require('worker_threads');
const { autoLoad } = require('./commons');

const constants = require('./constants')
const config = require('../config.json')

global.workers = new Workers()

global.startedClusters = 0
global.linesParsed = 0
global.avgResponse = []

global.status = { // TODO: move it?
  'TMI': constants.DISCONNECTED,
  'API': constants.DISCONNECTED,
  'MOD': false,
  'RES': 0
}

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
  try {
    global.general = new (require('./general.js'))()
    global.ui = new (require('./ui.js'))()
    global.currency = new Currency()
    global.stats2 = new (require('./stats.js'))()
    global.users = new (require('./users.js'))()

    global.events = new Events();
    global.customvariables = new (require('./customvariables.js'))()

    global.panel = new (require('./panel'))()
    global.twitch = new (require('./twitch'))()
    global.permissions = new Permissions()

    global.lib = {}
    global.lib.translate = new (require('./translate'))()
    global.translate = global.lib.translate.translate

    global.oauth = new OAuth();
    global.webhooks = new (require('./webhooks'))()
    global.api = new (require('./api'))()
  } catch (e) {
    error(e)
    process.exit()
  }

  const version = _.get(process, 'env.npm_package_version', 'x.y.z')
  console.log(figlet.textSync('sogeBot ' + version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'), {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }));
  info('Bot is starting up')

  global.lib.translate._load().then(async () => {
    global.stats = await autoLoad('./dest/stats/')
    global.registries = await autoLoad('./dest/registries/')
    global.systems = await autoLoad('./dest/systems/');
    global.widgets = await autoLoad('./dest/widgets/')
    global.overlays = await autoLoad('./dest/overlays/')
    global.games = await autoLoad('./dest/games/')
    global.integrations = await autoLoad('./dest/integrations/')

    global.panel.expose()

    if (process.env.HEAP && process.env.HEAP.toLowerCase() === 'true') {
      warning(chalk.bgRed.bold('HEAP debugging is ENABLED'))
      setTimeout(() => require('./heapdump.js').init('heap/'), 120000)
    }

    global.tmi = new (require('./tmi'))()
  })
}

if (isMainThread) {
  process.on('unhandledRejection', function (reason, p) {
    error(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`)
  })

  process.on('uncaughtException', (err) => {
    error(util.inspect(error))
    error('+------------------------------------------------------------------------------+')
    error('| BOT HAS UNEXPECTEDLY CRASHED                                                 |')
    error('| PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue |')
    error('| AND ADD logs/sogebot.log file to your report                                 |')
    error('+------------------------------------------------------------------------------+')
    process.exit(1)
  })
}
