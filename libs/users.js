'use strict'

var _ = require('lodash')
var moment = require('moment')
var constants = require('./constants')

const config = require('../config.json')

function Users () {
  this.rate_limit_follower_check = []

  global.parser.register(this, '!regular add', this.addRegular, constants.OWNER_ONLY)
  global.parser.register(this, '!regular remove', this.rmRegular, constants.OWNER_ONLY)
  global.parser.register(this, '!merge', this.merge, constants.MODS)

  global.panel.socketListening(this, 'viewers.toggle', this.toggleIs)

  // set all users offline on start
  this.setAll({ is: { online: false } })

  setInterval(async () => {
    // count subscribers
    let users = await global.users.getAll({ is: { subscriber: true } })
    global.twitch.current.subscribers = _.size(users)

    if (this.rate_limit_follower_check.length > 0) {
      this.rate_limit_follower_check = _.uniq(this.rate_limit_follower_check)
      this.isFollowerUpdate(this.rate_limit_follower_check.shift())
    }
  }, 1000) // run follower ONE request every second
}

Users.prototype.merge = async function (self, sender, text) {
  global.log.error('Merge is not implemented!')

  /*
  let username = text.trim()
  if (username.length === 0) {
    global.commons.sendMessage(global.translate('merge.noUsername'), sender)
    return
  }

  let user = await self.get(username)
  if (!_.isNil(user.id)) {
    let oldUser = _.filter(self.users, function (o) { return o.id === user.id && o.username !== username })
    if (oldUser.length > 0) {
      self.users[username] = _.clone(oldUser[0])
      self.users[username].username = username
      global.commons.sendMessage(global.translate('merge.success')
        .replace(/\$username/g, username)
        .replace('$merged-username', oldUser[0].username), sender)
      delete self.users[oldUser[0].username]
    } else {
      global.commons.sendMessage(global.translate('merge.noUsernameToMerge')
        .replace(/\$username/g, username), sender)
    }
  } else {
    global.commons.sendMessage(global.translate('merge.noID')
      .replace(/\$username/g, username), sender)
  }
  */
}

Users.prototype.get = async function (username) {
  username = username.toLowerCase()

  if (_.isNil(username)) global.log.error('username is NULL!\n' + new Error().stack)
  if (username === config.settings.bot_username || _.isNil(username)) {
    return {
      username: username,
      time: {},
      is: {},
      stats: {},
      custom: {}
    }
  }

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
  if (_.isNil(username)) global.log.error('username is NULL!\n' + new Error().stack)

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
  if (new Date().getTime() - user.time.followCheck < 1000 * 60 * 15) { // check can be performed _only_ every 15 minutes
    return
  }

  global.users.rate_limit_follower_check.push(username)
}

Users.prototype.isFollowerUpdate = async function (username) {
  let user = await global.users.get(username)

  if (_.isNil(user.id)) return // skip check if ID doesn't exist

  global.client.api({
    url: 'https://api.twitch.tv/kraken/users/' + user.id + '/follows/channels/' + global.channelId,
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Client-ID': config.settings.client_id
    }
  }, async function (err, res, body) {
    if (err) {
      global.log.error(err, { fnc: 'Users.prototype.isFollowerUpdate#1' })
      return
    }
    if (res.statusCode === 400) {
      body.username = username
      body.user_id = user.id
      body.channel_id = global.channelId
      body.url = 'https://api.twitch.tv/kraken/users/' + user.id + '/follows/channels/' + global.channelId
      global.log.error(JSON.stringify(body), { fnc: 'Users.prototype.isFollowerUpdate#2' })
      return
    }
    if (res.statusCode === 404) {
      if (user.is.follower) global.events.fire('unfollow', { username: username })
      global.users.set(username, { is: { follower: false }, time: { followCheck: new Date().getTime(), follow: 0 } }, user.is.follower)
    } else {
      if (!user.is.follower && new Date().getTime() - moment(body.created_at).format('X') * 1000 < 60000 * 60) {
        global.events.fire('follow', { username: username })
      }
      global.users.set(username, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment(body.created_at).format('X') * 1000 } }, !user.is.follower)
    }
  })
}

module.exports = Users
