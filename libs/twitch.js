'use strict'

var constants = require('./constants')
var User = require('./user')
var moment = require('moment')
var _ = require('lodash')
require('moment-precise-range-plugin')

function Twitch () {
  this.isOnline = false

  this.currentViewers = 0
  this.currentFollowers = 0
  this.maxViewers = 0
  this.chatMessagesAtStart = global.parser.linesParsed
  this.followersAtStart = 0
  this.maxRetries = 20
  this.curRetries = 0
  this.newChatters = 0

  this.whenOnline = null

  var self = this
  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/streams/' + global.configuration.get().twitch.owner
    }, function (err, res, body) {
      if (err) console.log(err)
      if (!_.isNull(body.stream) && !_.isNull(body.stream.created_at)) {
        self.curRetries = 0
        self.saveStream(body.stream)
        if (!self.isOnline) { // if we are switching from offline - bots restarts? We want refresh to correct data for start as well
          self.followersAtStart = body.stream.channel.followers
          self.chatMessagesAtStart = global.parser.linesParsed
        }
        self.isOnline = true
      } else {
        if (self.curRetries < self.maxRetries) { self.curRetries = self.curRetries + 1; return } // we want to check if stream is _REALLY_ offline
        // reset everything
        self.curRetries = 0
        self.isOnline = false
        self.whenOnline = null
        self.currentViewers = 0
        self.maxViewers = 0
        self.newChatters = 0
        self.chatMessagesAtStart = global.parser.linesParsed
        self.followersAtStart = !_.isNull(body.stream) ? body.stream.channel.followers : 0
        self.currentFollowers = self.followersAtStart
      }
    })

    // count watching time when stream is online
    if (self.isOnline) {
      User.getAllOnline().then(function (users) {
        _.each(users, function (user) {
          // add user as a new chatter in a stream
          if (_.isUndefined(user.watchTime) || user.watchTime === 0) self.newChatters = self.newChatters + 1
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
  global.parser.register(this, '!top', this.showTop, constants.OWNER_ONLY)

  global.parser.registerParser(this, 'lastseen', this.lastseenUpdate, constants.VIEWERS)

  this.webPanel()
}

Twitch.prototype.saveStream = function (stream) {
  this.currentViewers = stream.viewers
  this.whenOnline = stream.created_at
  this.currentFollowers = stream.channel.followers
  this.maxViewers = this.maxViewers < this.currentViewers ? this.currentViewers : this.maxViewers
}

Twitch.prototype.webPanel = function () {
  global.panel.addWidget('chat')
  global.panel.socketListening(this, 'getChatRoom', this.sendChatRoom)
  global.panel.socketListening(this, 'getUptime', this.sendUptime)
  global.panel.socketListening(this, 'getViewers', this.sendViewers)
  global.panel.socketListening(this, 'getChatMsgs', this.sendChatMsgs)
  global.panel.socketListening(this, 'getNewFlwrs', this.sendNewFlwrs)
  global.panel.socketListening(this, 'getNewChtr', this.sendNewChtr)
}

Twitch.prototype.sendUptime = function (self, socket) {
  socket.emit('uptime', self.getTime(false))
}

Twitch.prototype.sendViewers = function (self, socket) {
  socket.emit('viewers', self.currentViewers, self.maxViewers)
}

Twitch.prototype.sendChatRoom = function (self, socket) {
  socket.emit('chatRoom', global.configuration.get().twitch.owner.toLowerCase())
}

Twitch.prototype.sendChatMsgs = function (self, socket) {
  var messages = self.isOnline ? global.parser.linesParsed - self.chatMessagesAtStart : 0
  socket.emit('chatMsgs', messages > 20000 ? (messages / 1000) + 'k' : messages)
}

Twitch.prototype.sendNewFlwrs = function (self, socket) {
  socket.emit('newFlwrs', self.currentFollowers - self.followersAtStart)
}

Twitch.prototype.sendNewChtr = function (self, socket) {
  socket.emit('newChtr', self.newChatters)
}

Twitch.prototype.isOnline = function () {
  return this.isOnline
}

Twitch.prototype.getTime = function (isChat) {
  var now, days, hours, minutes, seconds
  now = _.isNull(this.whenOnline) ? {days: 0, hours: 0, minutes: 0, seconds: 0} : moment().preciseDiff(this.whenOnline, true)
  if (isChat) {
    days = now.days > 0 ? now.days + 'd' : ''
    hours = now.hours > 0 ? now.hours + 'h' : ''
    minutes = now.minutes > 0 ? now.minutes + 'm' : ''
    seconds = now.seconds > 0 ? now.seconds + 's' : ''
  } else {
    days = now.days > 0 ? now.days + 'd' : ''
    hours = now.hours >= 0 && now.hours < 10 ? '0' + now.hours + ':' : now.hours + ':'
    minutes = now.minutes >= 0 && now.minutes < 10 ? '0' + now.minutes + ':' : now.minutes + ':'
    seconds = now.seconds >= 0 && now.seconds < 10 ? '0' + now.seconds : now.seconds
  }
  return days + hours + minutes + seconds
}

Twitch.prototype.uptime = function (self, sender) {
  global.commons.sendMessage(self.isOnline ? global.translate('core.online').replace('(time)', self.getTime(true)) : global.translate('core.offline'))
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
      var message = ['@' + sender.username]
      // rank
      var rank = !_.isUndefined(user.get('rank')) ? user.get('rank') : null
      global.configuration.get().systems.ranks === true && !_.isNull(rank) ? message.push(rank) : null

      // watchTime
      var watchTime = user.get('watchTime')
      watchTime = _.isFinite(parseInt(watchTime, 10)) && _.isNumber(parseInt(watchTime, 10)) ? watchTime : 0
      message.push((watchTime / 1000 / 60 / 60).toFixed(1) + 'h')

      // points
      var points = !_.isUndefined(user.get('points')) ? user.get('points') : 0
      global.configuration.get().systems.points === true ? message.push(points + ' ' + global.systems.points.getPointsName(points)) : null

      global.commons.sendMessage(message.join(' | '), sender)
    })
  } catch (e) {
    global.log.error(e)
  }
}

Twitch.prototype.showTop = function (self, sender, text) {
  try {
    var parsed = text.match(/^(watched|points) (\d+)$/)
    if (parsed[1] === 'watched') parsed[1] = 'watchTime'
    var orderBy = {}; orderBy[parsed[1]] = -1
    global.botDB.find({$where: function () {
      return this._id.startsWith('user') &&
        this._id !== 'user_' + global.configuration.get().twitch.username &&
        this._id !== 'user_' + global.configuration.get().twitch.owner }})
    .limit(parsed[2])
    .sort(orderBy).exec(function (err, items) {
      if (err) global.log.error(err)

      global.commons.sendMessage(global.translate(parsed[1] === 'watchTime' ? 'top.listWatched' : 'top.listPoints').replace('(amount)', parsed[2]))
      var index = 0
      _.each(items, function (item) {
        index = index + 1
        if (parsed[1] === 'watchTime') {
          global.commons.sendMessage(index + '. ' + '@' + item.username + ' - ' + (!_.isUndefined(item.watchTime) ? item.watchTime / 1000 / 60 / 60 : 0).toFixed(1) + 'h')
        } else {
          global.commons.sendMessage(index + '. ' + '@' + item.username + ' - ' + (!_.isUndefined(item.points) ? item.points + ' ' + global.systems.points.getPointsName(item.points) : 0 + ' ' + global.systems.points.getPointsName(0)))
        }
      })
    })
  } catch (e) {
    global.log.error(e)
  }
}

module.exports = Twitch
