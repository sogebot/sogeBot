'use strict'

var constants = require('./constants')
var User = require('./user')
var moment = require('moment')
var _ = require('lodash')
require('moment-precise-range-plugin')

function Twitch () {
  this.isOnline = false

  this.channelId = null
  this.currentViewers = 0
  this.currentFollowers = 0
  this.currentViews = 0
  this.currentHosts = 0
  this.maxViewers = 0
  this.chatMessagesAtStart = global.parser.linesParsed
  this.maxRetries = 12
  this.curRetries = 0
  this.newChatters = 0
  this.currentStatus = ''
  this.currentGame = ''

  this.whenOnline = null

  this.cGamesTitles = {} // cached Games and Titles
  global.watcher.watch(this, 'cGamesTitles', this._save)
  this._load(this)

  var self = this
  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/streams/' + global.configuration.get().twitch.owner,
      headers: {
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        global.log.error(err)
        return
      }
      if (res.statusCode === 200 && !_.isNull(body.stream)) {
        self.curRetries = 0
        if (!self.isOnline) { // if we are switching from offline - bots restarts? We want refresh to correct data for start as well
          self.chatMessagesAtStart = global.parser.linesParsed
          self.currentViewers = 0
          self.maxViewers = 0
          self.newChatters = 0
          self.chatMessagesAtStart = global.parser.linesParsed
        }
        self.saveStream(body.stream)
        self.isOnline = true
      } else {
        if (self.isOnline && self.curRetries < self.maxRetries) { self.curRetries = self.curRetries + 1; return } // we want to check if stream is _REALLY_ offline
        // reset everything
        self.curRetries = 0
        self.isOnline = false
        self.whenOnline = null
      }
    })

    global.client.api({
      url: 'https://api.twitch.tv/kraken/channels/' + global.configuration.get().twitch.owner + '/follows?direction=DESC&limit=1',
      headers: {
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        global.log.error(err)
        return
      }
      if (res.statusCode === 200 && !_.isNull(body)) {
        if (self.currentFollowers !== body._total) User.updateFollowers()
        self.currentFollowers = body._total
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

  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/channels/' + global.configuration.get().twitch.owner,
      headers: {
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        global.log.error(err)
        return
      }
      if (res.statusCode === 200 && !_.isNull(body)) {
        self.currentGame = body.game
        self.currentStatus = body.status
        self.currentViews = body.views
        self.channelId = body._id
      }
    })

    if (!_.isNull(self.channelId)) {
      global.client.api({
        url: 'http://tmi.twitch.tv/hosts?include_logins=1&target=' + self.channelId
      }, function (err, res, body) {
        if (err) {
          global.log.error(err)
          return
        }
        if (res.statusCode === 200 && !_.isNull(body)) {
          self.currentHosts = body.hosts.length
        }
      })
    }

    global.client.api({
      url: 'https://api.twitch.tv/kraken',
      headers: {
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        global.status.API = constants.DISCONNECTED
        return
      }
      global.status.API = res.statusCode === 200 ? constants.CONNECTED : constants.DISCONNECTED
    })
  }, 60000)

  global.parser.register(this, '!uptime', this.uptime, constants.VIEWERS)
  global.parser.register(this, '!lastseen', this.lastseen, constants.VIEWERS)
  global.parser.register(this, '!watched', this.watched, constants.VIEWERS)
  global.parser.register(this, '!me', this.showMe, constants.VIEWERS)
  global.parser.register(this, '!top', this.showTop, constants.OWNER_ONLY)
  global.parser.register(this, '!title', this.setTitle, constants.OWNER_ONLY)
  global.parser.register(this, '!game', this.setGame, constants.OWNER_ONLY)

  global.parser.registerParser(this, 'lastseen', this.lastseenUpdate, constants.VIEWERS)

  this.webPanel()
}

Twitch.prototype._load = function (self) {
  global.botDB.findOne({ _id: 'cachedGamesTitles' }, function (err, item) {
    if (err) return log.error(err)
    if (_.isNull(item)) return
    self.cGamesTitles = item
  })
}

Twitch.prototype._save = function (self) {
  global.botDB.update({ _id: 'cachedGamesTitles' }, { $set: self.cGamesTitles }, { upsert: true })
  self.timestamp = new Date().getTime()
}

Twitch.prototype.saveStream = function (stream) {
  this.currentViewers = stream.viewers
  this.whenOnline = stream.created_at
  this.maxViewers = this.maxViewers < this.currentViewers ? this.currentViewers : this.maxViewers

  var messages = global.parser.linesParsed - this.chatMessagesAtStart
  global.stats.save({
    timestamp: new Date().getTime(),
    whenOnline: this.whenOnline,
    currentViewers: this.currentViewers,
    chatMessages: messages,
    currentFollowers: this.currentFollowers,
    currentViews: this.currentViews,
    maxViewers: this.maxViewers,
    newChatters: this.newChatters,
    game: this.currentGame,
    status: this.currentStatus,
    currentHosts: this.currentHosts
  })
}

Twitch.prototype.webPanel = function () {
  global.panel.addWidget('twitch', 'Twitch Stream Monitor', 'facetime-video')
  global.panel.socketListening(this, 'getTwitchVideo', this.sendTwitchVideo)
  global.panel.socketListening(this, 'getStats', this.sendStats)
}

Twitch.prototype.sendStats = function (self, socket) {
  var messages = self.isOnline ? global.parser.linesParsed - self.chatMessagesAtStart : 0
  var data = {
    uptime: self.getTime(false),
    currentViewers: self.currentViewers,
    maxViewers: self.maxViewers,
    chatMessages: messages > 20000 ? (messages / 1000) + 'k' : messages,
    currentFollowers: self.currentFollowers,
    currentViews: self.currentViews,
    newChatters: self.newChatters,
    game: self.currentGame,
    status: self.currentStatus,
    currentHosts: self.currentHosts
  }
  socket.emit('stats', data)
}

Twitch.prototype.sendTwitchVideo = function (self, socket) {
  socket.emit('twitchVideo', global.configuration.get().twitch.owner.toLowerCase())
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
  global.commons.sendMessage(self.isOnline ? global.translate('core.online').replace('(time)', self.getTime(true)) : global.translate('core.offline'), sender)
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
        .replace('(username)', '@' + user.username), sender)
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
          global.commons.sendMessage(index + '. ' + '@' + item.username + ' - ' + (!_.isUndefined(item.watchTime) ? item.watchTime / 1000 / 60 / 60 : 0).toFixed(1) + 'h', sender)
        } else {
          global.commons.sendMessage(index + '. ' + '@' + item.username + ' - ' + (!_.isUndefined(item.points) ? item.points + ' ' + global.systems.points.getPointsName(item.points) : 0 + ' ' + global.systems.points.getPointsName(0)), sender)
        }
      })
    })
  } catch (e) {
    global.log.error(e)
  }
}

Twitch.prototype.setTitle = function (self, sender, text) {
  if (text.trim().length === 0) {
    global.commons.sendMessage(global.translate('title.current')
      .replace('(title)', self.currentStatus), sender)
    return
  }

  global.client.api({
    url: 'https://api.twitch.tv/kraken/channels/' + global.configuration.get().twitch.owner,
    json: true,
    qs: {
      _method: 'put',
      channel: {
        status: text
      }
    },
    headers: {
      Accept: "application/vnd.twitchtv.v3+json",
      Authorization: 'OAuth ' + global.configuration.get().twitch.password.split(':')[1],
      'Client-ID': global.configuration.get().twitch.clientId
    }
  }, function (err, res, body) {
    if (err) { return console.log(err) }
    if (body.status === text.trim()) {
      global.commons.sendMessage(global.translate('title.change.success')
        .replace('(status)', body.status), sender)
    } else {
      global.commons.sendMessage(global.translate('title.change.failed')
        .replace('(status)', body.status), sender)
    }
  })
}

Twitch.prototype.setGame = function (self, sender, text) {
  if (text.trim().length === 0) {
    global.commons.sendMessage(global.translate('game.current')
      .replace('(game)', self.currentGame), sender)
    return
  }

  global.client.api({
    url: 'https://api.twitch.tv/kraken/channels/' + global.configuration.get().twitch.owner,
    json: true,
    qs: {
      _method: 'put',
      channel: {
        game: text
      }
    },
    headers: {
      Accept: 'application/vnd.twitchtv.v3+json',
      Authorization: 'OAuth ' + global.configuration.get().twitch.password.split(':')[1],
      'Client-ID': global.configuration.get().twitch.clientId
    }
  }, function (err, res, body) {
    if (err) { return console.log(err) }
    if (body.game === text.trim()) {
      global.commons.sendMessage(global.translate('game.change.success')
        .replace('(game)', body.game), sender)
    } else {
      global.commons.sendMessage(global.translate('game.change.failed')
        .replace('(game)', body.game), sender)
    }
  })
}

Twitch.prototype.sendGameFromTwitch = function (self, socket, game) {
  global.client.api({
    url: 'https://api.twitch.tv/kraken/search/games?q=' + encodeURIComponent(game) + '&type=suggest',
    json: true,
    headers: {
      Accept: 'application/vnd.twitchtv.v3+json',
      'Client-ID': global.configuration.get().twitch.clientId
    }
  }, function (err, res, body) {
    if (err) { return console.log(err) }
    socket.emit('sendGameFromTwitch', !_.isUndefined(body.games[0]) && game.toLowerCase() === body.games[0].name.toLowerCase() ? body.games[0].name : false)
  })
}

Twitch.prototype.sendUserTwitchGamesAndTitles = function (self, socket) {
  socket.emit('sendUserTwitchGamesAndTitles', global.twitch.cGamesTitles) // we need to use globals, as self is webpanel
}

Twitch.prototype.updateGameAndTitle = function (self, socket, data) {
  global.twitch.setTitle(global.twitch, null, data.title) // we need to use globals, as self is webpanel
  global.twitch.setGame(global.twitch, null, data.game)
  global.twitch.currentGame = data.game
  global.twitch.currentStatus = data.title

  if (_.isUndefined(global.twitch.cGamesTitles[data.game])) { //create key if doesnt exists
    global.twitch.cGamesTitles[data.game] = []
  }

  if(global.twitch.cGamesTitles[data.game].indexOf(data.title) == -1) { // if unique
    global.twitch.cGamesTitles[data.game].push(data.title) // also, we need to add game and title to cached property
  }
  global.twitch.sendStats(global.twitch, global.panel.io) // force dashboard update
}

module.exports = Twitch
