'use strict'

var _ = require('lodash')
var log = global.log

function Users () {
  this.changes = 0
  this.users = {}

  this._update(this)

  global.watcher.watch(this, 'changes', this._save)

  var self = this
  setInterval(function () {
    self.changes += 500 // force every 15min to save changes
  }, 15 * 60 * 1000)
}

Users.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'users' }, function (err, item) {
    if (err) return log.error(err)
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
  }
}

Users.prototype.get = function (username) {
  let user = _.isUndefined(this.users[username]) ? {} : this.users[username]
  if (_.isUndefined(user.id)) {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/users?login=' + username,
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        global.log.error(err)
        return
      }
      global.users.set(username, 'id', body.users[0]._id)
    })
  }
  return user
}

Users.prototype.getAll = function (object) {
  return _.filter(this.users, object)
}

Users.prototype.set = function (username, object, silent = true) {
  if (username === global.configuration.get().twitch.username) return // it shouldn't happen, but there can be more than one instance of a bot
  let user = _.isUndefined(this.users[username]) ? {} : this.users[username]
  this.users[username] = _.merge(user, object)
  if (silent) this.changes += 1
}

Users.prototype.updateFollowers = function () {
  console.log('updating followers')
}
/*

User.deleteFollowers = function () {
  return new Promise(function (resolve, reject) {
    global.botDB.update({ $where: function () { return this._id.startsWith('user') } }, { $set: { isFollower: false } }, function (err, numUpdated) {
      if (err) reject(err)
      resolve(numUpdated)
    })
  })
}

User.updateFollowers = function () {
  var makeRequest = function (cursor) {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/channels/' + global.channelId + '/follows?limit=100' + (!_.isUndefined(cursor) ? '&cursor=' + cursor : ''),
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        global.log.error(err)
        return
      }
      if (res.statusCode === 200 && !_.isNull(body) && body.follows.length > 0) {
        _.each(body.follows, function (follower) {
          var user = new User(follower.user.name)
          user.set('isFollower', true)
        })
        setTimeout(function () { makeRequest(body._cursor) }, 1000)
      }
    })
  }

  User.deleteFollowers().then(makeRequest())
}
*/
module.exports = Users
