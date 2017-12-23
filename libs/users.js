'use strict'

var _ = require('lodash')
var moment = require('moment')
var constants = require('./constants')
const snekfetch = require('snekfetch')

const config = require('../config.json')
const debug = require('debug')('users')

function Users () {
  this.rate_limit_follower_check = []
  this.increment = {}

  global.parser.register(this, '!regular add', this.addRegular, constants.OWNER_ONLY)
  global.parser.register(this, '!regular remove', this.rmRegular, constants.OWNER_ONLY)
  global.parser.register(this, '!merge', this.merge, constants.MODS)

  global.panel.addMenu({category: 'manage', name: 'viewers', id: 'viewers'})
  global.panel.socketListening(this, 'getViewers', this.getViewers)
  global.panel.socketListening(this, 'deleteViewer', this.deleteViewer)
  global.panel.socketListening(this, 'viewers.toggle', this.toggleIs)
  global.panel.socketListening(this, 'resetMessages', this.resetMessages)
  global.panel.socketListening(this, 'resetWatchTime', this.resetWatchTime)

  // set all users offline on start
  this.setAll({ is: { online: false } })

  setInterval(async () => {
    // we are in bounds of safe rate limit, wait until limit is refreshed
    if (this.rate_limit_follower_check.length > 0) {
      this.rate_limit_follower_check = _.uniq(this.rate_limit_follower_check)
      this.isFollowerUpdate(this.rate_limit_follower_check.shift())
    }
  }, 5000) // run follower ONE request every 5 second

  setInterval(async () => {
    let increment = this.increment
    this.increment = {}

    _.each(increment, (inc, username) => {
      global.db.engine.increment('users', { username: username }, { stats: { messages: inc } })
    })
  }, 60000)
}

Users.prototype.resetMessages = function (self, socket, data) {
  self.setAll({stats: {messages: 0}})
}

Users.prototype.resetWatchTime = function (self, socket, data) {
  self.setAll({time: {watched: 0}})
}

Users.prototype.getViewers = async function (self, socket) {
  let viewers = await global.users.getAll()
  socket.emit('Viewers', Buffer.from(JSON.stringify(viewers)).toString('base64'))
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

  // return all default values
  if (_.isUndefined(user.username)) user.username = username
  if (_.isUndefined(user.time)) user.time = {}
  if (_.isUndefined(user.is)) user.is = { }
  if (_.isUndefined(user.stats)) user.stats = {}
  if (_.isUndefined(user.custom)) user.custom = {}
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
      .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
      .set('Client-ID', config.settings.client_id)
    global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: global.twitch.remainingAPICalls })
    d('Request done: %j', request.body)
  } catch (e) {
    global.log.error(`API: ${url} - ${e.message}`)
    global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: e.message, remaining: global.twitch.remainingAPICalls })
    return
  }

  global.twitch.remainingAPICalls = request.headers['ratelimit-remaining']
  global.twitch.refreshAPICalls = request.headers['ratelimit-reset']

  if (request.body.total === 0) {
    // not a follower
    // if was follower, fire unfollow event
    if (user.is.follower) global.events.fire('unfollow', { username: username })
    global.users.set(username, { is: { follower: false }, time: { followCheck: new Date().getTime(), follow: 0 } }, user.is.follower)
  } else {
    // is follower
    if (!user.is.follower && new Date().getTime() - moment(request.body.data[0].followed_at).format('X') * 1000 < 60000 * 60) {
      global.events.fire('follow', { username: username })
    }
    global.users.set(username, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment(request.body.data[0].followed_at).format('X') * 1000 } }, !user.is.follower)
  }
}

Users.prototype.messagesInc = function (username) {
  if (_.isNil(global.users.increment[username])) global.users.increment[username] = 1
  else global.users.increment[username] = global.users.increment[username] + 1
}

module.exports = Users
