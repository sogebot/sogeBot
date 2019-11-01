if (Number(process.versions.node.split('.')[0]) < 11) {
  console.log('Upgrade your version of NodeJs! You need at least NodeJs 11.0.0, https://nodejs.org/en/. Current version is ' + process.versions.node)
  process.exit(1)
}

import 'reflect-metadata';

import { Permissions } from './permissions';
import { Events } from './events';
import { OAuth } from './oauth';
import { Currency } from './currency';
import { error, info, warning } from './helpers/log';
import { TMI } from './tmi';
import { API } from './api';
import { Twitch } from './twitch';
import { Socket } from './socket';
import { Webhooks } from './webhooks';
import { Users } from './users';
import { UI } from './ui';

import { createConnection, getConnectionOptions } from 'typeorm';


const figlet = require('figlet')
const util = require('util')
const _ = require('lodash')
const chalk = require('chalk')
const gitCommitInfo = require('git-commit-info');
const { isMainThread } = require('worker_threads');
import { isMainThread as isMainClusterThread } from './cluster';
const { autoLoad } = require('./commons');

const constants = require('./constants')
const config = require('../config.json')

global.linesParsed = 0
global.avgResponse = []

global.status = { // TODO: move it?
  'TMI': constants.DISCONNECTED,
  'API': constants.DISCONNECTED,
  'MOD': false,
  'RES': 0
}

import { changelog } from './changelog';

const isNeDB = config.database.type === 'nedb';
global.db = new (require('./databases/database'))(!isNeDB, !isNeDB);

const connect = async function () {
  const connectionOptions = await getConnectionOptions();
  createConnection({
    logging: false,
    synchronize: true,
    entities: [__dirname + '/entity/*.{js,ts}'],
    ...connectionOptions,
  });
};

async function main () {
  if (!global.db.engine.connected) {
    return setTimeout(() => main(), 10)
  }
  if (isMainThread) {
    await connect();
  }
  try {
    changelog();

    global.general = new (require('./general.js'))()
    global.socket = new Socket()
    global.ui = new UI()
    global.currency = new Currency()
    global.stats2 = new (require('./stats.js'))()
    global.users = new Users();

    global.events = new Events();
    global.customvariables = new (require('./customvariables.js'))()

    global.panel = new (require('./panel'))()
    global.twitch = new Twitch()
    global.permissions = new Permissions()

    global.lib = {}
    global.lib.translate = new (require('./translate'))()
    global.translate = global.lib.translate.translate

    global.oauth = new OAuth();
    global.webhooks = new Webhooks();
    global.api = new API();
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

    if (isMainClusterThread) {
      global.panel.expose();
    }

    if (process.env.HEAP && process.env.HEAP.toLowerCase() === 'true') {
      warning(chalk.bgRed.bold('HEAP debugging is ENABLED'))
      setTimeout(() => require('./heapdump.js').init('heap/'), 120000)
    }

    global.tmi = new TMI();
  })
}


main();

process.on('unhandledRejection', function (reason, p) {
  error(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`)
})

process.on('uncaughtException', (err) => {
  error(util.inspect(err))
  error('+------------------------------------------------------------------------------+')
  error('| BOT HAS UNEXPECTEDLY CRASHED                                                 |')
  error('| PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue |')
  error('| AND ADD logs/sogebot.log file to your report                                 |')
  error('+------------------------------------------------------------------------------+')
  process.exit(1)
})
