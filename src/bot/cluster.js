'use strict'

const util = require('util')
const _ = require('lodash')
const Parser = require('./parser')

var workerIsFree = {
  message: true,
  db: true
}

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
              data.items = await global.db.engine.find(data.table, data.where)
              break
            case 'findOne':
              data.items = await global.db.engine.findOne(data.table, data.where)
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
          if (process.send) process.send(data)
          workerIsFree.db = true
      }
    })

    if (process.env.HEAP && process.env.HEAP.toLowerCase() === 'true') {
      setTimeout(() => require('./heapdump.js').init('heap/'), 120000)
    }
  })

  async function message (data) {
    let sender = data.sender
    let message = data.message
    let skip = data.skip
    let quiet = data.quiet

    const parse = new Parser({ sender: sender, message: message, skip: skip, quiet: quiet })

    if (!skip && sender['message-type'] === 'whisper' && (!(await global.configuration.getValue('disableWhisperListener')) || global.commons.isOwner(sender))) {
      global.log.whisperIn(message, { username: sender.username })
    } else if (!skip && !await global.commons.isBot(sender.username)) global.log.chatIn(message, { username: sender.username })

    const isModerated = await parse.isModerated()
    const isIgnored = await global.commons.isIgnored(sender)

    if (!isModerated && !isIgnored) {
      if (!skip && !_.isNil(sender.username)) {
        let user = await global.db.engine.findOne('users', { id: sender.userId })
        let data = { id: sender.userId, is: { subscriber: (user.lock && user.lock.subscriber ? undefined : sender.isSubscriber), mod: sender.isModerator }, username: sender.username }

        // mark user as online
        await global.db.engine.update('users.online', { username: sender.username }, { username: sender.username })

        if (!_.get(sender, 'isSubscriber', false) || !_.get(sender, 'isTurboSubscriber', false)) _.set(data, 'stats.tier', 0) // unset tier if sender is not subscriber

        // update user based on id not username
        if (_.isEmpty(user)) await global.db.engine.insert('users', data)
        else await global.db.engine.update('users', { _id: String(user._id) }, data)

        if (process.send) process.send({ type: 'api', fnc: 'isFollower', username: sender.username })

        global.events.fire('keyword-send-x-times', { username: sender.username, message: message })
        if (message.startsWith('!')) {
          global.events.fire('command-send-x-times', { username: sender.username, message: message })
        } else if (!message.startsWith('!')) global.db.engine.insert('users.messages', { id: sender.userId, messages: 1 })
      }
      await parse.process()
    }
    if (process.send) process.send({ type: 'stats', of: 'parser', value: parse.time(), message: message })
  }
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

function gracefullyExit () {
  if (_.every(workerIsFree)) {
    process.exit()
  } else setTimeout(() => gracefullyExit(), 10)
}
