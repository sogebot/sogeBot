'use strict'

var _ = require('lodash')
var log = global.log
var moment = require('moment')
var constants = require('./constants')

function Users () {
  this.changes = 0
  this.users = {}
  this.rate_limit_follower_check = []

  this._update(this)

  global.parser.register(this, '!regular add', this.addRegular, constants.OWNER_ONLY)
  global.parser.register(this, '!regular remove', this.rmRegular, constants.OWNER_ONLY)

  global.watcher.watch(this, 'changes', this._save)

  var self = this
  setInterval(function () {
    self.changes += 500 // force every 15min to save changes
  }, 15 * 60 * 1000)

  setInterval(function () {
    if (self.rate_limit_follower_check.length > 0) {
      self.rate_limit_follower_check = _.uniq(self.rate_limit_follower_check)
      self.isFollowerUpdate(self.rate_limit_follower_check.shift())
    }
  }, 1000) // run follower ONE request every second
}

Users.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'users' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'Users.prototype._update' })
    if (_.isNull(item)) return

    delete item._id
    self.users = item.users

    // set all users offline
    _.each(global.users.getAll({is: { online: true }}), function (user) {
      global.users.set(user.username, {is: { online: false }}, true)
    })
  })
}

Users.prototype._save = function (self) {
  if (self.changes >= 500) {
    self.changes = 0
    var users = { users: self.users }
    global.botDB.update({ _id: 'users' }, { $set: users }, { upsert: true })
    global.botDB.persistence.compactDatafile()
  }
}

Users.prototype.get = function (username) {
  var self = this

  if (username === global.configuration.get().twitch.username || _.isNil(self.users)) {
    return {
      username: username,
      time: {},
      is: {},
      stats: {}
    }
  }

  let user = _.isUndefined(this.users[username]) ? {} : this.users[username]

  if (!_.isNil(user.id)) {
    let oldUser = _.filter(this.users, function (o) { return !_.isNil(o.id) && o.id === user.id && o.username !== username })
    if (oldUser.length > 0) {
      oldUser = oldUser[0]
      self.users[username] = {}
      self.users[username].time = !_.isNil(self.users[oldUser.username]) && !_.isNil(self.users[oldUser.username].time) ? self.users[oldUser.username].time : {}
      self.users[username].is = !_.isNil(self.users[oldUser.username]) && !_.isNil(self.users[oldUser.username].is) ? self.users[oldUser.username].is : {}
      self.users[username].stats = !_.isNil(self.users[oldUser.username]) && !_.isNil(self.users[oldUser.username].stats) ? self.users[oldUser.username].stats : {}
      self.users[username].points = !_.isNil(self.users[oldUser.username]) && !_.isNil(self.users[oldUser.username].points) ? self.users[oldUser.username].points : 0
      delete self.users[oldUser.username]
    }
  }

  // return all default attributes
  if (_.isUndefined(user.username)) user.username = username
  if (_.isUndefined(user.time)) user.time = {}
  if (_.isUndefined(user.is)) user.is = {}
  if (_.isUndefined(user.stats)) user.stats = {}
  return user
}

Users.prototype.getAll = function (object) {
  if (_.isObject(object)) return _.filter(this.users, object)
  return this.users
}

Users.prototype.addRegular = function (self, sender, text) {
  const username = text.trim()

  if (username.length === 0) {
    global.commons.sendMessage(global.translate('regulars.add.empty'), sender)
    return false
  }

  if (!_.isNil(_.find(self.users, function (o) { return o.username === username }))) {
    self.set(username, { is: { regular: true } })
    global.commons.sendMessage(global.translate('regulars.add.success').replace('(username)', username), sender)
  } else {
    global.commons.sendMessage(global.translate('regulars.add.undefined').replace('(username)', username), sender)
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
    global.commons.sendMessage(global.translate('regulars.rm.success').replace('(username)', username), sender)
  } else {
    global.commons.sendMessage(global.translate('regulars.rm.undefined').replace('(username)', username), sender)
    return false
  }
}

Users.prototype.set = function (username, object, silent = false) {
  if (username === global.configuration.get().twitch.username) return // it shouldn't happen, but there can be more than one instance of a bot
  let user = _.isUndefined(this.users[username]) ? {} : this.users[username]
  this.users[username] = _.merge(user, object)

  // also we need to be sure that all default attrs exists
  if (_.isUndefined(this.users[username].username)) this.users[username].username = username
  if (_.isUndefined(this.users[username].time)) this.users[username].time = {}
  if (_.isUndefined(this.users[username].is)) this.users[username].is = {}
  if (_.isUndefined(this.users[username].stats)) this.users[username].stats = {}

  if (!silent) this.changes += 1
}

Users.prototype.setAll = function (object) {
  var self = this
  _.each(this.users, function (user) {
    self.set(user.username, object, true)
  })
}

Users.prototype.delete = function (username) {
  delete this.users[username]
}

Users.prototype.isFollower = function (username) {
  if (new Date().getTime() - global.users.get(username).time.followCheck < 1000 * 60 * 15) { // check can be performed _only_ every 15 minutes
    return
  }

  global.users.rate_limit_follower_check.push(username)
}

Users.prototype.isFollowerUpdate = function (username) {
  if (_.isNil(global.users.get(username).id)) return // skip check if ID doesn't exist

  global.client.api({
    url: 'https://api.twitch.tv/kraken/users/' + global.users.get(username).id + '/follows/channels/' + global.channelId,
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Client-ID': global.configuration.get().twitch.clientId
    }
  }, function (err, res, body) {
    if (err) {
      global.log.error(err, { fnc: 'Users.prototype.isFollowerUpdate#1' })
      return
    }
    if (res.statusCode === 400) {
      body.username = username
      body.user_id = global.users.get(username).id
      body.channel_id = global.channelId
      body.url = 'https://api.twitch.tv/kraken/users/' + global.users.get(username).id + '/follows/channels/' + global.channelId
      global.log.error(JSON.stringify(body), { fnc: 'Users.prototype.isFollowerUpdate#2' })
      return
    }
    if (res.statusCode === 404) {
      if (global.users.get(username).is.follower) {
        global.log.unfollow(username)
        global.events.fire('unfollow', { username: username })
      }
      global.users.set(username, { is: { follower: false }, time: { followCheck: new Date().getTime(), follow: 0 } }, global.users.get(username).is.follower)
    } else {
      if (!global.users.get(username).is.follower) {
        global.events.fire('follow', { username: username })
      }
      global.users.set(username, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment(body.created_at).format('X') * 1000 } }, !global.users.get(username).is.follower)
    }
  })
}

module.exports = Users
