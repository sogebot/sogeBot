'use strict'

var constants = require('./constants')
var User = require('./user')
var moment = require('moment')
var _ = require('lodash')
require('moment-precise-range-plugin')

function Twitch () {
  this.isOnline = false
  this.whenOnline = moment()

  var self = this
  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/streams/' + global.configuration.get().twitch.owner
    }, function (err, res, body) {
      if (err) console.log(err)
      if (body.stream) {
        if (!self.isOnline) self.whenOnline = moment()
        self.isOnline = true
      } else self.isOnline = false
    })

    // count watching time when stream is online
    if (self.isOnline) {
      User.getAllOnline().then(function (users) {
        _.each(users, function (user) {
          var watchTime = 15000
          if (!_.isUndefined(user.watchTime)) watchTime = watchTime + user.watchTime
          user = new User(user.username)
          user.isLoaded().then(function () {
            user.set('watchTime', watchTime)
          })
        })
      })
    }
  }, 15000)

  global.parser.register(this, '!uptime', this.uptime, constants.VIEWERS)
  global.parser.register(this, '!lastseen', this.lastseen, constants.VIEWERS)
  global.parser.register(this, '!watched', this.watched, constants.VIEWERS)
  global.parser.register(this, '!me', this.showMe, constants.VIEWERS)

  global.parser.registerParser(this, 'lastseen', this.lastseenUpdate, constants.VIEWERS)
}

Twitch.prototype.isOnline = function () {
  return this.isOnline
}

Twitch.prototype.uptime = function (self, sender) {
  var now = moment().preciseDiff(self.whenOnline, true)
  var days = now.days > 0 ? now.days + 'd' : ''
  var hours = now.hours > 0 ? now.hours + 'h' : ''
  var minutes = now.minutes > 0 ? now.minutes + 'm' : ''
  var seconds = now.seconds > 0 ? now.seconds + 's' : ''
  global.commons.sendMessage(self.isOnline ? global.translate('core.online').replace('(time)', days + hours + minutes + seconds) : global.translate('core.offline'))
}

Twitch.prototype.lastseenUpdate = function (self, id, sender, text) {
  var user = new User(sender.username)
  user.isLoaded().then(function () {
    user.set('lastMessageTime', new Date().getTime())
    user.setOnline()
  })
  global.updateQueue(id, true)
}

Twitch.prototype.lastseen = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    var user = new User(parsed[0])
    user.isLoaded().then(function () {
      var lastMessageTime = user.get('lastMessageTime')
      if (_.isNull(lastMessageTime) || _.isUndefined(lastMessageTime)) {
        global.commons.sendMessage(global.translate('lastseen.success.never').replace('(username)', parsed[0]), sender)
      } else {
        var timestamp = moment.unix(lastMessageTime / 1000)
        global.commons.sendMessage(global.translate('lastseen.success.time')
          .replace('(username)', parsed[0])
          .replace('(when)', timestamp.format('DD-MM-YYYY HH:mm:ss')), sender)
      }
    })
  } catch (e) {
    global.commons.sendMessage(global.translate('lastseen.failed.parse'), sender)
  }
}

Twitch.prototype.watched = function (self, sender, text) {
  try {
    var user
    if (text.trim() < 1) user = new User(sender.username)
    else {
      var parsed = text.match(/^(\w+)$/)
      user = new User(parsed[0])
    }
    user.isLoaded().then(function () {
      var watchTime = user.get('watchTime')
      watchTime = _.isFinite(parseInt(watchTime, 10)) && _.isNumber(parseInt(watchTime, 10)) ? watchTime : 0
      var watched = watchTime / 1000 / 60 / 60
      global.commons.sendMessage(global.translate('watched.success.time')
        .replace('(time)', watched.toFixed(1))
        .replace('(username)', user.username), sender)
    })
  } catch (e) {
    global.commons.sendMessage(global.translate('watched.failed.parse'), sender)
  }
}

Twitch.prototype.showMe = function (self, sender, text) {
  try {
    var user = new User(sender.username)
    user.isLoaded().then(function () {
      var message = [sender.username]
      // watchTime
      var watchTime = user.get('watchTime')
      watchTime = _.isFinite(parseInt(watchTime, 10)) && _.isNumber(parseInt(watchTime, 10)) ? watchTime : 0
      message.push((watchTime / 1000 / 60 / 60).toFixed(1) + 'h')

      // points
      var points = !_.isUndefined(user.points) ? user.points : 0
      global.configuration.get().systems.points === true ? message.push(points + ' ' + global.systems.points.getPointsName(points)) : null

      global.commons.sendMessage(message.join(' | '), sender)
    })
  } catch (e) {
    global.log.error(e)
  }
}

module.exports = Twitch
