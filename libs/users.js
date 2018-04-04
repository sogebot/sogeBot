'use strict'

var _ = require('lodash')
var constants = require('./constants')
const XRegExp = require('xregexp')
const cluster = require('cluster')

const config = require('../config.json')
const debug = require('debug')('users')

function Users () {
  if (cluster.isMaster) {
    this.panel()
  }

  // set all users offline on start
  this.setAll({ is: { online: false } })
}

Users.prototype.commands = function () {
  return [
    {this: this, command: '!regular add', fnc: this.addRegular, permission: constants.OWNER_ONLY},
    {this: this, command: '!regular remove', fnc: this.rmRegular, permission: constants.OWNER_ONLY},
    {this: this, command: '!merge', fnc: this.merge, permission: constants.MODS},
    {this: this, command: '!ignore add', fnc: this.ignoreAdd, permission: constants.OWNER_ONLY},
    {this: this, command: '!ignore rm', fnc: this.ignoreRm, permission: constants.OWNER_ONLY},
    {this: this, command: '!ignore check', fnc: this.ignoreCheck, permission: constants.OWNER_ONLY}
  ]
}

Users.prototype.panel = function () {
  if (_.isNil(global.panel)) return setTimeout(() => this.panel(), 10)

  global.panel.addMenu({category: 'manage', name: 'viewers', id: 'viewers'})
  global.panel.socketListening(this, 'getViewers', this.getViewers)
  global.panel.socketListening(this, 'deleteViewer', this.deleteViewer)
  global.panel.socketListening(this, 'viewers.toggle', this.toggleIs)
  global.panel.socketListening(this, 'resetMessages', this.resetMessages)
  global.panel.socketListening(this, 'resetWatchTime', this.resetWatchTime)

  this.sockets()
}

Users.prototype.sockets = function (self) {
  const io = global.panel.io.of('/users')

  io.on('connection', (socket) => {
    debug('Socket connected, registering sockets')
    socket.on('ignore.list.save', async function (data, callback) {
      try {
        await global.db.engine.remove('users_ignorelist', {})

        let promises = []
        for (let username of data) {
          if (username.trim().length === 0) continue
          username = username.trim().toLowerCase()
          promises.push(
            global.db.engine.update('users_ignorelist', { username: username }, { username: username })
          )
        }
        await Promise.all(promises)
        callback(null, null)
      } catch (e) {
        callback(e, null)
      }
    })

    socket.on('ignore.list', async function (callback) {
      const users = await global.db.engine.find('users_ignorelist')
      callback(null, _.orderBy(users, 'username', 'asc'))
    })

    socket.on('save', async (data, cb) => {
      await global.db.engine.update('users', { username: data.username }, data)
      cb(null, null)
    })

    socket.on('delete', async (username, cb) => {
      await global.db.engine.remove('users', { username: username })
      await global.db.engine.remove('users.tips', { username: username })
      await global.db.engine.remove('users.bits', { username: username })
      cb(null, null)
    })

    socket.on('users.tips', async (username, cb) => {
      const tips = await global.db.engine.find('users.tips', { username: username })
      cb(null, _.orderBy(tips, 'timestamp', 'desc'))
    })

    socket.on('users.bits', async (username, cb) => {
      const bits = await global.db.engine.find('users.bits', { username: username })
      cb(null, _.orderBy(bits, 'timestamp', 'desc'))
    })

    socket.on('users.bits.add', async (data, cb) => {
      var errors = {}
      try {
        if (parseInt(data.amount, 10) <= 0 || String(data.amount).trim().length === 0) errors.amount = global.translate('ui.errors.this_value_must_be_a_positive_number_and_greater_then_0')

        if (String(data.timestamp).trim().length === 0) errors.message = global.translate('ui.errors.value_cannot_be_empty')
        else if (parseInt(data.timestamp, 10) <= 0) errors.timestamp = global.translate('ui.errors.this_value_must_be_a_positive_number_and_greater_then_0')

        if (_.size(errors) > 0) throw Error(JSON.stringify(errors))

        await global.db.engine.insert('users.bits', data)
        cb(null, null)
      } catch (e) {
        global.log.warning(e.message)
        cb(e.message, null)
      }
    })

    socket.on('users.tips.add', async (data, cb) => {
      var errors = {}
      try {
        const cash = XRegExp.exec(data.amount, XRegExp(`(?<amount> [0-9.]*)\\s?(?<currency> .*)`, 'ix'))

        if (_.isNil(cash)) errors.amount = global.translate('ui.errors.something_went_wrong')
        else {
          if (_.isNil(cash.amount) || parseFloat(cash.amount) <= 0) errors.amount = global.translate('ui.errors.this_value_must_be_a_positive_number_and_greater_then_0')
          if (_.isNil(cash.currency) || !global.currency.isCodeSupported(cash.currency.toUpperCase())) errors.amount = global.translate('ui.errors.this_currency_is_not_supported')
        }

        if (String(data.timestamp).trim().length === 0) errors.message = global.translate('ui.errors.value_cannot_be_empty')
        else if (parseInt(data.timestamp, 10) <= 0) errors.timestamp = global.translate('ui.errors.this_value_must_be_a_positive_number_and_greater_then_0')

        if (_.size(errors) > 0) throw Error(JSON.stringify(errors))

        data.currency = cash.currency.toUpperCase()
        data.amount = parseFloat(cash.amount)
        await global.db.engine.insert('users.tips', data)
        cb(null, null)
      } catch (e) {
        global.log.warning(e.message)
        cb(e.message, null)
      }
    })
  })
}

Users.prototype.ignoreAdd = async function (self, sender, text) {
  const match = XRegExp.exec(text, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  await global.db.engine.update('users_ignorelist', { username: match.username }, { username: match.username })
  let message = await global.commons.prepare('ignore.user.is.added', { username: match.username })
  debug(message); global.commons.sendMessage(message, sender)
}

Users.prototype.ignoreRm = async function (self, sender, text) {
  const match = XRegExp.exec(text, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  await global.db.engine.remove('users_ignorelist', { username: match.username })
  let message = await global.commons.prepare('ignore.user.is.removed', { username: match.username })
  debug(message); global.commons.sendMessage(message, sender)
}

Users.prototype.ignoreCheck = async function (self, sender, text) {
  const match = XRegExp.exec(text, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: match.username })
  let message
  if (!_.isEmpty(ignoredUser)) {
    message = await global.commons.prepare('ignore.user.is.ignored', { username: match.username })
  } else {
    message = await global.commons.prepare('ignore.user.is.not.ignored', { username: match.username })
  }
  debug(message); global.commons.sendMessage(message, sender)
  return !_.isEmpty(ignoredUser)
}

Users.prototype.resetMessages = function (self, socket, data) {
  self.setAll({stats: {messages: 0}})
}

Users.prototype.resetWatchTime = function (self, socket, data) {
  self.setAll({time: {watched: 0}})
}

Users.prototype.getViewers = async function (self, socket) {
  let [viewers, tips, bits] = await Promise.all([
    global.users.getAll(),
    global.db.engine.find('users.tips'),
    global.db.engine.find('users.bits')
  ])
  for (let viewer of viewers) {
    // TIPS
    let tipsOfViewer = _.filter(tips, (o) => o.username === viewer.username)
    if (!_.isEmpty(tipsOfViewer)) {
      let tipsAmount = 0
      for (let tip of tipsOfViewer) tipsAmount += global.currency.exchange(tip.amount, tip.currency, await global.configuration.getValue('currency'))
      _.set(viewer, 'stats.tips', tipsAmount)
    } else {
      _.set(viewer, 'stats.tips', 0)
    }
    _.set(viewer, 'custom.currency', global.currency.symbol(await global.configuration.getValue('currency')))

    // BITS
    let bitsOfViewer = _.filter(bits, (o) => o.username === viewer.username)
    if (!_.isEmpty(bitsOfViewer)) {
      let bitsAmount = 0
      for (let bit of bitsOfViewer) bitsAmount += parseInt(bit.amount, 10)
      _.set(viewer, 'stats.bits', bitsAmount)
    } else {
      _.set(viewer, 'stats.bits', 0)
    }
  }
  socket.emit('Viewers', Buffer.from(JSON.stringify(viewers), 'utf8').toString('base64'))
}

Users.prototype.deleteViewer = function (self, socket, username) {
  global.users.delete(username)
  self.getViewers(self, socket)
}

/*
 * Will merge (rename) old user to new user (used in case of user rename) - no merging is done for simplicity
 * Usage: !merge -from oldusername -to newusername
*/
Users.prototype.merge = async function (self, sender, text) {
  let [fromUser, toUser] = [text.match(/-from ([a-zA-Z0-9_]+)/), text.match(/-to ([a-zA-Z0-9_]+)/)]

  if (_.isNil(fromUser)) {
    let message = await global.commons.prepare('merge.no-from-user-set')
    debug(message); global.commons.sendMessage(message, sender)
    return
  } else { fromUser = fromUser[1] }

  if (_.isNil(toUser)) {
    let message = await global.commons.prepare('merge.no-to-user-set')
    debug(message); global.commons.sendMessage(message, sender)
    return
  } else { toUser = toUser[1] }

  let [toUserFromDb, fromUserFromDb] = await Promise.all([
    global.db.engine.findOne('users', { username: toUser }),
    global.db.engine.findOne('users', { username: fromUser })
  ])

  if (_.isEmpty(fromUserFromDb)) {
    let message = await global.commons.prepare('merge.from-user-not-found', { fromUsername: fromUser })
    debug(message); global.commons.sendMessage(message, sender)
    return
  }

  if (!_.isEmpty(toUserFromDb)) {
    await Promise.all([
      global.db.engine.remove('users', { _id: toUserFromDb._id.toString() }),
      global.db.engine.update('users', { _id: fromUserFromDb._id.toString() }, { username: toUserFromDb.username })
    ])
  } else {
    await global.db.engine.update('users', { _id: fromUserFromDb._id.toString() }, { username: toUser })
  }

  let message = await global.commons.prepare('merge.user-merged', { fromUsername: fromUser, toUsername: toUser })
  debug(message); global.commons.sendMessage(message, sender)
}

Users.prototype.get = async function (username) {
  username = username.toLowerCase()

  let user = await global.db.engine.findOne('users', { username: username })

  user.points = _.get(user, 'points', 0) >= Number.MAX_SAFE_INTEGER / 1000000 ? Math.floor(Number.MAX_SAFE_INTEGER / 1000000) : parseInt(_.get(user, 'points', 0), 10)
  user.username = _.get(user, 'username', username).toLowerCase()
  user.time = _.get(user, 'time', {})
  user.is = _.get(user, 'is', {})
  user.stats = _.get(user, 'stats', {})
  user.custom = _.get(user, 'custom', {})

  try {
    if (!_.isNil(user._id)) user._id = user._id.toString() // force retype _id
    if (_.isNil(user.time.created_at) && !_.isNil(user.id)) { // this is accessing master (in points) and worker
      if (cluster.isMaster) global.api.fetchAccountAge(username, user.id)
      else process.send({type: 'api', fnc: 'fetchAccountAge', username: username, id: user.id})
    }
  } catch (e) {
    global.log.error(e.stack)
  }
  return user
}

Users.prototype.getAll = async function (object) {
  let users = await global.db.engine.find('users', object)
  return users
}

Users.prototype.toggleIs = function (self, socket, data) {
  let object = { is: {} }
  object.is[data.type] = data.is
  self.set(data.username, object)
}

Users.prototype.addRegular = function (self, sender, text) {
  const username = text.trim()

  if (username.length === 0) {
    global.commons.sendMessage(global.translate('regulars.add.empty'), sender)
    return false
  }

  if (!_.isNil(_.find(self.users, function (o) { return o.username === username }))) {
    self.set(username, { is: { regular: true } })
    global.commons.sendMessage(global.translate('regulars.add.success').replace(/\$username/g, username), sender)
  } else {
    global.commons.sendMessage(global.translate('regulars.add.undefined').replace(/\$username/g, username), sender)
    return false
  }
}

Users.prototype.rmRegular = function (self, sender, text) {
  const username = text.trim()

  if (username.length === 0) {
    global.commons.sendMessage(global.translate('regulars.rm.empty'), sender)
    return false
  }

  if (!_.isNil(_.find(self.users, function (o) { return o.username === username }))) {
    self.set(username, { is: { regular: false } })
    global.commons.sendMessage(global.translate('regulars.rm.success').replace(/\$username/g, username), sender)
  } else {
    global.commons.sendMessage(global.translate('regulars.rm.undefined').replace(/\$username/g, username), sender)
    return false
  }
}

Users.prototype.set = async function (username, object) {
  if (_.isNil(username)) return global.log.error('username is NULL!\n' + new Error().stack)

  username = username.toLowerCase()
  if (username === config.settings.bot_username || _.isNil(username)) return // it shouldn't happen, but there can be more than one instance of a bot

  // force max value of points
  object.points = _.get(object, 'points', 0) >= Number.MAX_SAFE_INTEGER / 1000000 ? Math.floor(Number.MAX_SAFE_INTEGER / 1000000) : parseInt(_.get(object, 'points', 0), 10)
  if (object.points === 0) { // or re-set from db
    const user = await global.users.get(username)
    object.points = user.points
  }

  let result = await global.db.engine.update('users', { username: username }, object)
  return result
}

Users.prototype.setAll = async function (object) {
  let result = await global.db.engine.update('users', {}, object)
  return result
}

Users.prototype.delete = function (username) {
  global.db.engine.remove('users', { username: username })
}

module.exports = Users
