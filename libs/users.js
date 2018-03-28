'use strict'

var _ = require('lodash')
var moment = require('moment')
var constants = require('./constants')
const snekfetch = require('snekfetch')
const XRegExp = require('xregexp')

const config = require('../config.json')
const debug = require('debug')('users')

function Users () {
  this.rate_limit_follower_check = []
  this.rate_limit_subscriber_check = []

  global.parser.register(this, '!regular add', this.addRegular, constants.OWNER_ONLY)
  global.parser.register(this, '!regular remove', this.rmRegular, constants.OWNER_ONLY)
  global.parser.register(this, '!merge', this.merge, constants.MODS)

  /* ignore commands */
  global.parser.register(this, '!ignore add', this.ignoreAdd, constants.OWNER_ONLY)
  global.parser.register(this, '!ignore rm', this.ignoreRm, constants.OWNER_ONLY)
  global.parser.register(this, '!ignore check', this.ignoreCheck, constants.OWNER_ONLY)

  global.panel.addMenu({category: 'manage', name: 'viewers', id: 'viewers'})
  global.panel.socketListening(this, 'getViewers', this.getViewers)
  global.panel.socketListening(this, 'deleteViewer', this.deleteViewer)
  global.panel.socketListening(this, 'viewers.toggle', this.toggleIs)
  global.panel.socketListening(this, 'resetMessages', this.resetMessages)
  global.panel.socketListening(this, 'resetWatchTime', this.resetWatchTime)

  this.sockets()

  // set all users offline on start
  this.setAll({ is: { online: false } })

  setInterval(async () => {
    // we are in bounds of safe rate limit, wait until limit is refreshed
    if (this.rate_limit_follower_check.length > 0) {
      this.rate_limit_follower_check = _.uniq(this.rate_limit_follower_check)
      this.isFollowerUpdate(this.rate_limit_follower_check.shift())
    }
  }, 1000) // run follower ONE request every 1 second
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
  })
}

Users.prototype.ignoreAdd = async function (self, sender, text) {
  const match = XRegExp.exec(text, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  await global.db.engine.update('users_ignorelist', { username: match.username }, { username: match.username })
  let message = global.commons.prepare('ignore.user.is.added', { username: match.username })
  debug(message); global.commons.sendMessage(message, sender)
}

Users.prototype.ignoreRm = async function (self, sender, text) {
  const match = XRegExp.exec(text, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  await global.db.engine.remove('users_ignorelist', { username: match.username })
  let message = global.commons.prepare('ignore.user.is.removed', { username: match.username })
  debug(message); global.commons.sendMessage(message, sender)
}

Users.prototype.ignoreCheck = async function (self, sender, text) {
  const match = XRegExp.exec(text, constants.USERNAME_REGEXP)
  if (_.isNil(match)) return

  match.username = match.username.toLowerCase()

  let ignoredUser = await global.db.engine.findOne('users_ignorelist', { username: match.username })
  let message
  if (!_.isEmpty(ignoredUser)) {
    message = global.commons.prepare('ignore.user.is.ignored', { username: match.username })
  } else {
    message = global.commons.prepare('ignore.user.is.not.ignored', { username: match.username })
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
      for (let tip of tipsOfViewer) tipsAmount += global.currency.exchange(tip.amount, tip.currency, global.configuration.getValue('currency'))
      _.set(viewer, 'stats.tips', tipsAmount)
    } else {
      _.set(viewer, 'stats.tips', 0)
    }
    _.set(viewer, 'custom.currency', global.currency.symbol(global.configuration.getValue('currency')))

    // BITS
    let bitsOfViewer = _.filter(bits, (o) => o.username === viewer.username)
    if (!_.isEmpty(bitsOfViewer)) {
      let bitsAmount = 0
      for (let bit of bitsOfViewer) bitsAmount += bit.amount
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
    let message = global.commons.prepare('merge.no-from-user-set')
    debug(message); global.commons.sendMessage(message, sender)
    return
  } else { fromUser = fromUser[1] }

  if (_.isNil(toUser)) {
    let message = global.commons.prepare('merge.no-to-user-set')
    debug(message); global.commons.sendMessage(message, sender)
    return
  } else { toUser = toUser[1] }

  let [toUserFromDb, fromUserFromDb] = await Promise.all([
    global.db.engine.findOne('users', { username: toUser }),
    global.db.engine.findOne('users', { username: fromUser })
  ])

  if (_.isEmpty(fromUserFromDb)) {
    let message = global.commons.prepare('merge.from-user-not-found', { fromUsername: fromUser })
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

  let message = global.commons.prepare('merge.user-merged', { fromUsername: fromUser, toUsername: toUser })
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

  if (!_.isNil(user._id)) user._id = user._id.toString() // force retype _id
  if (_.isNil(user.time.created_at) && !_.isNil(user.id)) this.fetchAccountAge(this, username, user.id)

  return user
}

Users.prototype.fetchAccountAge = function (self, username, id) {
  global.client.api({
    url: 'https://api.twitch.tv/kraken/users/' + id,
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Client-ID': config.settings.client_id
    }
  }, function (err, res, body) {
    if (err) { return }
    if (res.statusCode === 200) {
      self.set(username, { time: { created_at: moment(body.created_at).format('X') * 1000 } })
    }
  })
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

Users.prototype.isFollower = async function (username) {
  let user = await global.users.get(username)
  if (new Date().getTime() - user.time.followCheck < 1000 * 60 * 30) { // check can be performed _only_ every 30 minutes
    return
  }

  global.users.rate_limit_follower_check.push(username)
}

Users.prototype.isFollowerUpdate = async function (username) {
  const d = require('debug')('users:isFollowerUpdate')

  if ((global.twitch.remainingAPICalls <= 10 && global.twitch.refreshAPICalls > _.now() / 1000)) {
    d('Skip for rate-limit to refresh and re-add user to queue')
    global.users.rate_limit_follower_check.push(username)
    return
  }

  if (username === config.settings.broadcaster_username || username === config.settings.bot_username) {
    // skip if bot or broadcaster
    d('IsFollowerUpdate SKIP for user %s', username)
    return
  }

  let user = await global.users.get(username)
  if (_.isNil(user.id)) return // skip check if ID doesn't exist

  const url = `https://api.twitch.tv/helix/users/follows?from_id=${user.id}&to_id=${global.channelId}`
  try {
    d('IsFollowerUpdate check for user %s', username)
    var request = await snekfetch.get(url)
      .set('Accept', 'application/vnd.twitchtv.v5+json')
      .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
      .set('Client-ID', config.settings.client_id)
    global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: global.twitch.remainingAPICalls })
    d('Request done: %j', request.body)
  } catch (e) {
    global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.message)}`)
    global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: global.twitch.remainingAPICalls })
    return
  }

  global.twitch.remainingAPICalls = request.headers['ratelimit-remaining']
  global.twitch.refreshAPICalls = request.headers['ratelimit-reset']

  if (request.body.total === 0) {
    // not a follower
    // if was follower, fire unfollow event
    if (user.is.follower) {
      global.log.unfollow(username)
      global.events.fire('unfollow', { username: username })
    }
    global.users.set(username, { is: { follower: false }, time: { followCheck: new Date().getTime(), follow: 0 } }, user.is.follower)
  } else {
    // is follower
    if (!user.is.follower && new Date().getTime() - moment(request.body.data[0].followed_at).format('x') < 60000 * 60) {
      global.overlays.eventlist.add({
        type: 'follow',
        username: username
      })
      global.log.follow(username)
      global.events.fire('follow', { username: username })
    }
    global.users.set(username, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: parseInt(moment(request.body.data[0].followed_at).format('x'), 10) } }, !user.is.follower)
  }
}

module.exports = Users
