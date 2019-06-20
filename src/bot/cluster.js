'use strict'

const util = require('util')
const _ = require('lodash')

import { Events } from './events'
import { Permissions } from './permissions'
import { OAuth } from './oauth';
import { Currency } from './currency';
const { autoLoad } = require('./commons');

cluster()

function cluster () {
  if (!global.db.engine.connected) {
    setTimeout(() => cluster(), 10)
    return
  }

  try {
    global.general = new (require('./general'))()
    global.ui = new (require('./ui'))()
    global.currency = new Currency()
    global.users = new (require('./users'))()
    global.events = new Events();
    global.customvariables = new (require('./customvariables'))()
    global.twitch = new (require('./twitch'))()
    global.permissions = new Permissions()

    global.lib = {}
    global.lib.translate = new (require('./translate'))()
    global.translate = global.lib.translate.translate

    global.oauth = new OAuth()
    global.api = new (require('./api'))()
    global.tmi = new (require('./tmi'))()
  } catch (e) {
    console.error(e); global.log.error(e)
    return global.workers.sendToMaster({ type: 'crash' })
  }

  global.lib.translate._load().then(async () => {
    try {
      global.stats = await autoLoad('./dest/stats/')
      global.systems = await autoLoad('./dest/systems/')
      global.overlays = await autoLoad('./dest/overlays/')
      global.games = await autoLoad('./dest/games/')
      global.integrations = await autoLoad('./dest/integrations/')
    } catch (e) {
      console.error(e); global.log.error(e)
    }

    global.workers.setListeners()

    if (process.env.HEAP && process.env.HEAP.toLowerCase() === 'true') {
      setTimeout(() => require('./heapdump.js').init('heap/'), 120000)
    }
  })
}

process.on('unhandledRejection', function (reason, p) {
  if (_.isNil(global.log)) return console.log(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`)
  global.log.error(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`)
})

process.on('uncaughtException', (error) => {
  if (_.isNil(global.log)) return console.log(error)
  global.log.error(util.inspect(error))
  global.log.error('+------------------------------------------------------------------------------+')
  global.log.error('| WORKER HAS UNEXPECTEDLY CRASHED                                              |')
  global.log.error('| PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue |')
  global.log.error('| AND ADD logs/exceptions.log file to your report                              |')
  global.log.error('+------------------------------------------------------------------------------+')
  process.exit(1)
})