'use strict'

const util = require('util')

import { Events } from './events'
import { Permissions } from './permissions'
import { OAuth } from './oauth';
import { Currency } from './currency';
import { error } from './helpers/log'
const { autoLoad } = require('./commons');
import { API } from './api';
import { TMI } from './tmi';
import { Twitch } from './twitch';
import { Users } from './users';
import { UI } from './ui';

cluster()

function cluster () {
  if (!global.db.engine.connected) {
    setTimeout(() => cluster(), 10)
    return
  }

  try {
    global.general = new (require('./general'))()
    global.ui = new UI()
    global.currency = new Currency()
    global.users = new Users()
    global.events = new Events();
    global.customvariables = new (require('./customvariables'))()
    global.twitch = new Twitch()
    global.permissions = new Permissions()

    global.lib = {}
    global.lib.translate = new (require('./translate'))()
    global.translate = global.lib.translate.translate

    global.oauth = new OAuth()
    global.api = new API();
    global.tmi = new TMI();
  } catch (e) {
    console.error(e); error(e)
    return global.workers.sendToMaster({ type: 'crash' })
  }

  global.lib.translate._load().then(async () => {
    try {
      global.stats = await autoLoad('./dest/stats/')
      global.registries = await autoLoad('./dest/registries/')
      global.systems = await autoLoad('./dest/systems/')
      global.overlays = await autoLoad('./dest/overlays/')
      global.games = await autoLoad('./dest/games/')
      global.integrations = await autoLoad('./dest/integrations/')
    } catch (e) {
      console.error(e); error(e)
    }

    global.workers.setListeners()

    if (process.env.HEAP && process.env.HEAP.toLowerCase() === 'true') {
      setTimeout(() => require('./heapdump.js').init('heap/'), 120000)
    }
  })
}

process.on('unhandledRejection', function (reason, p) {
  error(`Possibly Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`)
})

process.on('uncaughtException', (error) => {
  error(util.inspect(error))
  error('+------------------------------------------------------------------------------+')
  error('| WORKER HAS UNEXPECTEDLY CRASHED                                              |')
  error('| PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue |')
  error('| AND ADD logs/exceptions.log file to your report                              |')
  error('+------------------------------------------------------------------------------+')
  process.exit(1)
})