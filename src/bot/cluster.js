'use strict'

const util = require('util')
const _ = require('lodash')

cluster()

function cluster () {
  if (!global.db.engine.connected) {
    setTimeout(() => cluster(), 10)
    return
  }

  global.configuration = new (require('./configuration.js'))()
  global.currency = new (require('./currency.js'))()
  global.users = new (require('./users.js'))()
  global.events = new (require('./events.js'))()
  global.customvariables = new (require('./customvariables.js'))()
  global.twitch = new (require('./twitch'))()
  global.permissions = new (require('./permissions'))()

  global.lib = {}
  global.lib.translate = new (require('./translate'))()
  global.translate = global.lib.translate.translate

  global.oauth = new (require('./oauth.js'))()
  global.api = new (require('./api'))()
  global.tmi = new (require('./tmi'))()

  global.lib.translate._load().then(function () {
    try {
      global.systems = require('auto-load')('./dest/systems/')
      global.overlays = require('auto-load')('./dest/overlays/')
      global.games = require('auto-load')('./dest/games/')
      global.integrations = require('auto-load')('./dest/integrations/')
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