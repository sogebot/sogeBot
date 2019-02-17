'use strict'

const util = require('util')
const _ = require('lodash')
const Parser = require('./parser')

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

    process.on('message', async (data) => {
      switch (data.type) {
        case 'call':
          const namespace = _.get(global, data.ns, null)
          namespace[data.fnc].apply(namespace, data.args)
          break
        case 'lang':
          await global.lib.translate._load()
          break
        case 'shutdown':
          gracefullyExit()
          break
        case 'message':
          workerIsFree.message = false
          await message(data)
          workerIsFree.message = true
          break
        case 'db':
          workerIsFree.db = false
          switch (data.fnc) {
            case 'find':
              data.items = await global.db.engine.find(data.table, data.where, data.lookup)
              break
            case 'findOne':
              data.items = await global.db.engine.findOne(data.table, data.where, data.lookup)
              break
            case 'increment':
              data.items = await global.db.engine.increment(data.table, data.where, data.object)
              break
            case 'incrementOne':
              data.items = await global.db.engine.incrementOne(data.table, data.where, data.object)
              break
            case 'insert':
              data.items = await global.db.engine.insert(data.table, data.object)
              break
            case 'remove':
              data.items = await global.db.engine.remove(data.table, data.where)
              break
            case 'update':
              data.items = await global.db.engine.update(data.table, data.where, data.object)
              break
            case 'index':
              data.items = await global.db.engine.index(data.opts)
              break
            case 'count':
              data.items = await global.db.engine.count(data.table, data.where, data.object)
              break
            default:
              global.log.error('This db call is not correct')
              global.log.error(data)
          }
          if (parentPort && parentPort.postMessage) parentPort.postMessage(data)
          workerIsFree.db = true
      }
    })

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