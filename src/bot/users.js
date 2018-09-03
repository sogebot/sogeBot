'use strict'

var _ = require('lodash')
var constants = require('./constants')
const XRegExp = require('xregexp')
const cluster = require('cluster')

const config = require('@config')
const debug = require('debug')('users')
const Timeout = require('./timeout')

function Users () {
  this.timeouts = {}

  this.uiSortCache = null
  this.uiSortCacheViewers = []

  if (cluster.isMaster) {
    this.panel()
    this.compactMessagesDb()
    this.compactWatchedDb()
    this.updateWatchTime(new Date())

    // set all users offline on start
    global.db.engine.remove('users.online', {})
  }
}

Users.prototype.commands = function () {
  return [
    { this: this, id: '!regular add', command: '!regular add', fnc: this.addRegular, permission: constants.OWNER_ONLY },
    { this: this, id: '!regular remove', command: '!regular remove', fnc: this.rmRegular, permission: constants.OWNER_ONLY },
    { this: this, id: '!merge', command: '!merge', fnc: this.merge, permission: constants.MODS },
    { this: this, id: '!ignore add', command: '!ignore add', fnc: this.ignoreAdd, permission: constants.OWNER_ONLY },
    { this: this, id: '!ignore rm', command: '!ignore rm', fnc: this.ignoreRm, permission: constants.OWNER_ONLY },
    { this: this, id: '!ignore check', command: '!ignore check', fnc: this.ignoreCheck, permission: constants.OWNER_ONLY }
  ]
}

Users.prototype.panel = function () {
  if (_.isNil(global.panel)) return setTimeout(() => this.panel(), 10)

  global.panel.addMenu({ category: 'manage', name: 'viewers', id: 'viewers' })
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
        // update ignore list
        global.commons.processAll({ type: 'call', ns: 'commons', fnc: 'loadIgnoreList' })
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
      if (!_.isNil(data.points)) {
        let points = data.points; delete data.points
        await global.systems.points.set({ username: null, parameters: `${data.username} ${points}` })
      }
      if (!_.isNil(data.stats.messages)) {
        let messages = Number(data.stats.messages); delete data.stats.messages
        messages -= Number(await this.getMessagesOf(data.username))
        await global.db.engine.insert('users.messages', { username: data.username, messages: messages })
      }
      if (!_.isNil(data.time.watched)) {
        let watched = Number(data.time.watched); delete data.time.watched
        watched -= Number(await this.getWatchedOf(data.username))
        await global.db.engine.insert('users.watched', { username: data.username, watched })
      }
      await global.db.engine.update('users', { username: data.username }, data)
      cb(null, null)
    })

    socket.on('delete', async (username, cb) => {
      await global.db.engine.remove('users', { username: username })
      await global.db.engine.remove('users.tips', { username: username })
      await global.db.engine.remove('users.bits', { username: username })
      await global.db.engine.remove('users.messages', { username: username })
      await global.db.engine.remove('users.points', { username: username })
      await global.db.engine.remove('users.watched', { username: username })
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

    socket.on('users.bits.update', async (data, cb) => {
      var errors = {}
      try {
        if (parseInt(data.amount, 10) <= 0 || String(data.amount).trim().length === 0) errors.amount = global.translate('ui.errors.this_value_must_be_a_positive_number_and_greater_then_0')

        if (String(data.timestamp).trim().length === 0) errors.message = global.translate('ui.errors.value_cannot_be_empty')
        else if (parseInt(data.timestamp, 10) <= 0) errors.timestamp = global.translate('ui.errors.this_value_must_be_a_positive_number_and_greater_then_0')

        if (_.size(errors) > 0) throw Error(JSON.stringify(errors))

        const _id = data._id; delete data._id
        await global.db.engine.update('users.bits', { _id: _id }, data)
        cb(null, null)
      } catch (e) {
        global.log.warning(e.message)
        cb(e.message, null)
      }
    })

    socket.on('users.bits.delete', async (_id, cb) => {
      try {
        await global.db.engine.remove('users.bits', { _id: _id })
        cb(null, null)
      } catch (e) {
        global.log.warning(e.message)
        cb(e.message, null)
      }
    })

    socket.on('users.tips.delete', async (_id, cb) => {
      try {
        await global.db.engine.remove('users.tips', { _id: _id })
        cb(null, null)
      } catch (e) {
        global.log.warning(e.message)
        cb(e.message, null)
      }
    })

    socket.on('users.tips.add', async (data, cb) => {
      var errors = {}
      try {
        const cash = XRegExp.exec(data.amount, XRegExp('(?<amount> [0-9.]*)\\s?(?<currency> .*)', 'ix'))

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

    socket.on('users.tips.update', async (data, cb) => {
      var errors = {}
      try {
        const cash = XRegExp.exec(data.amount, XRegExp('(?<amount> [0-9.]*)\\s?(?<currency> .*)', 'ix'))

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
        const _id = data._id; delete data._id
        await global.db.engine.update('users.tips', { _id: _id }, data)
        cb(null, null)
      } catch (e) {
        global.log.warning(e.message)
        cb(e.message, null)
      }
    })

    socket.on('users.get', async (opts, cb) => {
      opts = _.defaults(opts, { page: 1, sortBy: 'username', order: '', filter: null, show: { subscribers: null, followers: null, active: null, regulars: null } })
      opts.page-- // we are counting index from 0

      const processUser = async (viewer) => {
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

        // ONLINE
        let isOnline = !_.isEmpty(_.filter(online, (o) => o.username === viewer.username))
        _.set(viewer, 'is.online', isOnline)

        // POINTS
        if (!_.isEmpty(_.filter(points, (o) => o.username === viewer.username))) {
          _.set(viewer, 'points', await global.systems.points.getPointsOf(viewer.username))
        } else _.set(viewer, 'points', 0)

        // MESSAGES
        if (!_.isEmpty(_.filter(messages, (o) => o.username === viewer.username))) {
          _.set(viewer, 'stats.messages', await global.users.getMessagesOf(viewer.username))
        } else _.set(viewer, 'stats.messages', 0)

        // WATCHED
        if (!_.isEmpty(_.filter(messages, (o) => o.username === viewer.username))) {
          _.set(viewer, 'time.watched', await global.users.getWatchedOf(viewer.username))
        } else _.set(viewer, 'time.watched', 0)
        return viewer
      }

      const itemsPerPage = 50
      const batchSize = 10

      let [viewers, tips, bits, online, points, messages] = await Promise.all([
        global.users.getAll(),
        global.db.engine.find('users.tips'),
        global.db.engine.find('users.bits'),
        global.db.engine.find('users.online'),
        global.db.engine.find('users.points'),
        global.db.engine.find('users.messages')
      ])

      // filter users
      if (!_.isNil(opts.filter)) viewers = _.filter(viewers, (o) => o.username && o.username.toLowerCase().startsWith(opts.filter.toLowerCase().trim()))
      if (!_.isNil(opts.show.subscribers)) viewers = _.filter(viewers, (o) => _.get(o, 'is.subscriber', false) === opts.show.subscribers)
      if (!_.isNil(opts.show.followers)) viewers = _.filter(viewers, (o) => _.get(o, 'is.follower', false) === opts.show.followers)
      if (!_.isNil(opts.show.regulars)) viewers = _.filter(viewers, (o) => _.get(o, 'is.regular', false) === opts.show.regulars)
      if (!_.isNil(opts.show.active)) {
        viewers = _.filter(viewers, (o) => {
          return _.intersection(online.map((v) => v.username), viewers.map((v) => v.username)).includes(o.username) === opts.show.active
        })
      }

      const _total = _.size(viewers)
      opts.page = opts.page > viewers.length - 1 ? viewers.length - 1 : opts.page // page should not be out of bounds (if filters etc)

      if (_total === 0) {
        const response = { viewers: [], _total: _total }
        cb(response)
      } else if (['username', 'time.message', 'time.follow', 'time.subscribed_at', 'stats.tier'].includes(opts.sortBy)) {
        // we can sort directly in users collection
        viewers = _.chunk(_.orderBy(viewers, (o) => {
          // we move null and 0 to last always
          if (_.get(o, opts.sortBy, 0) === 0) {
            return opts.order === 'desc' ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
          } else return _.get(o, opts.sortBy, 0)
        }, opts.order), itemsPerPage)[opts.page]

        let toAwait = []
        let i = 0
        for (let viewer of viewers) {
          if (i > batchSize) {
            await Promise.all(toAwait)
            i = 0
          }
          i++
          toAwait.push(processUser(viewer))
        }
        await Promise.all(toAwait)
      } else {
        // check if this sort is cached
        const cacheId = `${opts.sortBy}${opts.order}${opts.filter}${JSON.toString(opts.show)}`
        const isCached = this.uiSortCache === cacheId
        if (!isCached) this.uiSortCache = cacheId
        else {
          // get only needed viewers
          viewers = _.chunk(_.orderBy(this.uiSortCacheViewers, opts.sortBy, opts.order), itemsPerPage)[opts.page]
        }

        // we need to fetch all viewers and then sort
        let toAwait = []
        let i = 0
        for (let viewer of viewers) {
          if (i > batchSize) {
            await Promise.all(toAwait)
            i = 0
          }
          i++
          toAwait.push(processUser(viewer))
        }
        await Promise.all(toAwait)
        if (!isCached) {
          this.uiSortCacheViewers = viewers // save cache data
          viewers = _.chunk(_.orderBy(viewers, opts.sortBy, opts.order), itemsPerPage)[opts.page]
        }
      }
      const response = {
        viewers: viewers,
        _total: _total
      }
      cb(response)
    })
  })
}

Users.prototype.ignoreAdd = async function (opts) {
  const match = XRegExp.exec(opts.parameters, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  await global.db.engine.update('users_ignorelist', { username: match.username }, { username: match.username })

  // update ignore list
  global.commons.processAll({ ns: 'commons', fnc: 'loadIgnoreList' })

  let message = await global.commons.prepare('ignore.user.is.added', { username: match.username })
  debug(message); global.commons.sendMessage(message, opts.sender)
}

Users.prototype.ignoreRm = async function (opts) {
  const match = XRegExp.exec(opts.parameters, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  await global.db.engine.remove('users_ignorelist', { username: match.username })
  global.commons.processAll({ type: 'call', ns: 'commons', fnc: 'loadIgnoreList' })
  let message = await global.commons.prepare('ignore.user.is.removed', { username: match.username })
  debug(message); global.commons.sendMessage(message, opts.sender)
}

Users.prototype.ignoreCheck = async function (opts) {
  const match = XRegExp.exec(opts.parameters, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: match.username })
  let message
  if (!_.isEmpty(ignoredUser)) {
    message = await global.commons.prepare('ignore.user.is.ignored', { username: match.username })
  } else {
    message = await global.commons.prepare('ignore.user.is.not.ignored', { username: match.username })
  }
  debug(message); global.commons.sendMessage(message, opts.sender)
  return !_.isEmpty(ignoredUser)
}

Users.prototype.resetMessages = function (self, socket, data) {
  global.db.engine.remove('users.messages', {})
}

Users.prototype.resetWatchTime = function (self, socket, data) {
  self.setAll({ time: { watched: 0 } })
}

Users.prototype.deleteViewer = function (self, socket, username) {
  global.users.delete(username)
}

/*
 * Will merge (rename) old user to new user (used in case of user rename) - no merging is done for simplicity
 * Usage: !merge -from oldusername -to newusername
*/
Users.prototype.merge = async function (opts) {
  let [fromUser, toUser] = [opts.parameters.match(/-from ([a-zA-Z0-9_]+)/), opts.parameters.match(/-to ([a-zA-Z0-9_]+)/)]

  if (_.isNil(fromUser)) {
    let message = await global.commons.prepare('merge.no-from-user-set')
    debug(message); global.commons.sendMessage(message, opts.sender)
    return
  } else { fromUser = fromUser[1] }

  if (_.isNil(toUser)) {
    let message = await global.commons.prepare('merge.no-to-user-set')
    debug(message); global.commons.sendMessage(message, opts.sender)
    return
  } else { toUser = toUser[1] }

  let [toUserFromDb, fromUserFromDb] = await Promise.all([
    global.db.engine.findOne('users', { username: toUser }),
    global.db.engine.findOne('users', { username: fromUser })
  ])

  if (_.isEmpty(fromUserFromDb)) {
    let message = await global.commons.prepare('merge.from-user-not-found', { fromUsername: fromUser })
    debug(message); global.commons.sendMessage(message, opts.sender)
    return
  }

  if (!_.isEmpty(toUserFromDb)) {
    await Promise.all([
      global.db.engine.remove('users', { _id: toUserFromDb._id.toString() }),
      global.db.engine.update('users', { _id: fromUserFromDb._id.toString() }, { username: toUserFromDb.username }),
      global.db.engine.update('users.points', { username: fromUserFromDb.username }, { username: toUserFromDb.username })
    ])
  } else {
    await global.db.engine.update('users', { _id: fromUserFromDb._id.toString() }, { username: toUser })
  }

  let message = await global.commons.prepare('merge.user-merged', { fromUsername: fromUser, toUsername: toUser })
  debug(message); global.commons.sendMessage(message, opts.sender)
}

Users.prototype.get = async function (username) {
  username = username.toLowerCase()

  let user = await global.db.engine.findOne('users', { username: username })

  user.username = _.get(user, 'username', username).toLowerCase()
  user.time = _.get(user, 'time', {})
  user.is = _.get(user, 'is', {})
  user.stats = _.get(user, 'stats', {})
  user.custom = _.get(user, 'custom', {})

  try {
    if (!_.isNil(user._id)) user._id = user._id.toString() // force retype _id
    if (_.isNil(user.time.created_at) && !_.isNil(user.id)) { // this is accessing master (in points) and worker
      if (cluster.isMaster) global.api.fetchAccountAge(username, user.id)
      else process.send({ type: 'api', fnc: 'fetchAccountAge', username: username, id: user.id })
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

Users.prototype.addRegular = function (opts) {
  const username = opts.parameters.trim()

  if (username.length === 0) {
    global.commons.sendMessage(global.translate('regulars.add.empty'), opts.sender)
    return false
  }

  if (!_.isNil(_.find(this.users, function (o) { return o.username === username }))) {
    this.set(username, { is: { regular: true } })
    global.commons.sendMessage(global.translate('regulars.add.success').replace(/\$username/g, username), opts.sender)
  } else {
    global.commons.sendMessage(global.translate('regulars.add.undefined').replace(/\$username/g, username), opts.sender)
    return false
  }
}

Users.prototype.rmRegular = function (opts) {
  const username = opts.parameters.trim()

  if (username.length === 0) {
    global.commons.sendMessage(global.translate('regulars.rm.empty'), opts.sender)
    return false
  }

  if (!_.isNil(_.find(this.users, function (o) { return o.username === username }))) {
    this.set(username, { is: { regular: false } })
    global.commons.sendMessage(global.translate('regulars.rm.success').replace(/\$username/g, username), opts.sender)
  } else {
    global.commons.sendMessage(global.translate('regulars.rm.undefined').replace(/\$username/g, username), opts.sender)
    return false
  }
}

Users.prototype.set = async function (username, object) {
  if (_.isNil(username)) return global.log.error('username is NULL!\n' + new Error().stack)

  username = username.toLowerCase()
  if (username === config.settings.bot_username.toLowerCase() || _.isNil(username)) return // it shouldn't happen, but there can be more than one instance of a bot
  return global.db.engine.update('users', { username: username }, object)
}

Users.prototype.setAll = async function (object) {
  let result = await global.db.engine.update('users', {}, object)
  return result
}

Users.prototype.delete = function (username) {
  global.db.engine.remove('users', { username: username })
}

Users.prototype.updateWatchTime = async function () {
  let timeout = 60000
  try {
    // count watching time when stream is online
    if (await global.cache.isOnline()) {
      let users = await global.db.engine.find('users.online')
      let updated = []
      for (let onlineUser of users) {
        updated.push(onlineUser.username)
        const watched = typeof this.watchedList[onlineUser.username] === 'undefined' ? timeout : new Date().getTime() - new Date(this.watchedList[onlineUser.username]).getTime()
        await global.db.engine.insert('users.watched', { username: onlineUser.username, watched })
        this.watchedList[onlineUser.username] = new Date()
      }

      // remove offline users from watched list
      for (let u of Object.entries(this.watchedList)) {
        if (!updated.includes(u[0])) delete this.watchedList[u[0]]
      }
    } else throw Error('stream offline')
  } catch (e) {
    this.watchedList = {}
    timeout = 1000
  }
  return new Timeout().recursive({ this: this, uid: 'updateWatchTime', wait: timeout, fnc: this.updateWatchTime })
}

Users.prototype.compactWatchedDb = async function () {
  try {
    await global.commons.compactDb({ table: 'users.watched', index: 'username', values: 'watched' })
  } catch (e) {
    global.log.error(e)
    global.log.error(e.stack)
  } finally {
    new Timeout().recursive({ uid: 'compactWatchedDb', this: this, fnc: this.compactWatchedDb, wait: 10000 })
  }
}

Users.prototype.getWatchedOf = async function (user) {
  let watched = 0
  for (let item of await global.db.engine.find('users.watched', { username: user })) {
    let itemPoints = !_.isNaN(parseInt(_.get(item, 'watched', 0))) ? _.get(item, 'watched', 0) : 0
    watched = watched + Number(itemPoints)
  }
  if (Number(watched) < 0) watched = 0

  return parseInt(
    Number(watched) <= Number.MAX_SAFE_INTEGER / 1000000
      ? watched
      : Number.MAX_SAFE_INTEGER / 1000000, 10)
}

Users.prototype.compactMessagesDb = async function () {
  try {
    await global.commons.compactDb({ table: 'users.messages', index: 'username', values: 'messages' })
  } catch (e) {
    global.log.error(e)
    global.log.error(e.stack)
  } finally {
    new Timeout().recursive({ uid: 'compactMessagesDb', this: this, fnc: this.compactMessagesDb, wait: 10000 })
  }
}

Users.prototype.getMessagesOf = async function (user) {
  let messages = 0
  for (let item of await global.db.engine.find('users.messages', { username: user })) {
    let itemPoints = !_.isNaN(parseInt(_.get(item, 'messages', 0))) ? _.get(item, 'messages', 0) : 0
    messages = messages + Number(itemPoints)
  }
  if (Number(messages) < 0) messages = 0

  return parseInt(
    Number(messages) <= Number.MAX_SAFE_INTEGER / 1000000
      ? messages
      : Number.MAX_SAFE_INTEGER / 1000000, 10)
}

Users.prototype.getUsernamesFromIds = async function (IdsList) {
  let IdsToUsername = {}
  for (let id of IdsList) {
    if (!_.isNil(IdsToUsername[id])) continue // skip if already had map
    IdsToUsername[id] = (await global.db.engine.findOne('users', { id })).username
  }
  return IdsToUsername
}

module.exports = Users
