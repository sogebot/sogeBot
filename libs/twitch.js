'use strict'

var constants = require('./constants')
var moment = require('moment')
var _ = require('lodash')
require('moment-precise-range-plugin')

function Twitch () {
  this.isOnline = false

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

  this.cached = {
    followers: []
  }

  this.whenOnline = null

  this.cGamesTitles = {} // cached Games and Titles
  global.watcher.watch(this, 'cGamesTitles', this._save)
  this._load(this)

  var self = this
  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/streams/' + global.channelId,
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#1' })
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
      url: 'https://api.twitch.tv/kraken/channels/' + global.channelId + '/follows?limit=100',
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#2' })
        return
      }
      if (res.statusCode === 200 && !_.isNull(body)) {
        self.currentFollowers = body._total

        self.cached.followers = []
        _.each(body.follows, function (follower) {
          if (!global.users.get(follower.user.name).is.follower) {
            global.log.follow(follower.user.name)
          }
          global.users.set(follower.user.name, { is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment(follower.created_at).format('X') * 1000 } })
          self.cached.followers.push(follower.user.name)
        })
      }
    })

    // count watching time when stream is online
    if (self.isOnline) {
      const users = global.users.getAll({ is: { online: true } })
      _.each(users, function (user) {
        // add user as a new chatter in a stream
        if (_.isUndefined(user.time.watched) || user.time.watched === 0) self.newChatters = self.newChatters + 1
        const time = (!_.isUndefined(user.time.watched)) ? 15000 + user.time.watched : 15000
        global.users.set(user.username, { time: { watched: time } })
      })
    }
  }, 15000)

  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/channels/' + global.channelId + '?timestamp=' + new Date().getTime(),
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }, function (err, res, body) {
      if (err) {
        if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#3' })
        return
      }
      if (res.statusCode === 200 && !_.isNull(body)) {
        self.currentGame = body.game
        self.currentStatus = body.status
        self.currentViews = body.views
      }
    })

    if (!_.isNull(global.channelId)) {
      global.client.api({
        url: 'http://tmi.twitch.tv/hosts?include_logins=1&target=' + global.channelId
      }, function (err, res, body) {
        if (err) {
          if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#4' })
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
  }, 10000)

  global.parser.register(this, '!uptime', this.uptime, constants.VIEWERS)
  global.parser.register(this, '!lastseen', this.lastseen, constants.VIEWERS)
  global.parser.register(this, '!watched', this.watched, constants.VIEWERS)
  global.parser.register(this, '!followage', this.followage, constants.VIEWERS)
  global.parser.register(this, '!me', this.showMe, constants.VIEWERS)
  global.parser.register(this, '!top', this.showTop, constants.OWNER_ONLY)
  global.parser.register(this, '!title', this.setTitle, constants.OWNER_ONLY)
  global.parser.register(this, '!game', this.setGame, constants.OWNER_ONLY)

  global.parser.registerParser(this, 'lastseen', this.lastseenUpdate, constants.VIEWERS)

  global.configuration.register('uptimeFormat', 'core.settings.uptime-format', 'string', '(days)(hours)(minutes)(seconds)')

  this.webPanel()
}

Twitch.prototype._load = function (self) {
  global.botDB.findOne({ _id: 'cachedGamesTitles' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: 'Twitch.prototype._load' })
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
  global.panel.addWidget('twitch', 'widget-title-monitor', 'facetime-video')
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
  socket.emit('twitchVideo', global.configuration.get().twitch.channel.toLowerCase())
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
    return { days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds }
  } else {
    days = now.days > 0 ? now.days + 'd' : ''
    hours = now.hours >= 0 && now.hours < 10 ? '0' + now.hours + ':' : now.hours + ':'
    minutes = now.minutes >= 0 && now.minutes < 10 ? '0' + now.minutes + ':' : now.minutes + ':'
    seconds = now.seconds >= 0 && now.seconds < 10 ? '0' + now.seconds : now.seconds
    return days + hours + minutes + seconds
  }
}

Twitch.prototype.uptime = function (self, sender) {
  const time = self.getTime(true)
  global.commons.sendMessage(self.isOnline ? global.translate('core.online')
    .replace('(time)', global.configuration.getValue('uptimeFormat')
    .replace('(days)', time.days)
    .replace('(hours)', time.hours)
    .replace('(minutes)', time.minutes)
    .replace('(seconds)', time.seconds)) : global.translate('core.offline'), sender)
}

Twitch.prototype.lastseenUpdate = function (self, id, sender, text) {
  if (_.isNull(sender)) {
    global.updateQueue(id, true)
    return
  }
  global.users.set(sender.username, { time: { message: new Date().getTime() } }, true)
  if (_.isUndefined(global.users.get(sender.username).is) || !global.users.get(sender.username).is.online) global.users.set(sender.username, { is: { online: true } }, true)
  global.users.set(sender.username, { is: { subscriber: sender.subscriber } }, true) // save subscriber status
  global.updateQueue(id, true)
}

Twitch.prototype.followage = function (self, sender, text) {
  let username
  let parsed = text.match(/^(\S?)+$/g)
  if (parsed[0].length > 0) username = parsed[0]
  else username = sender.username

  global.users.isFollower(username)

  const user = global.users.get(username)
  if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.follow) || _.isNil(user.is.follower) || !user.is.follower) {
    global.commons.sendMessage(global.translate('followage.success.never').replace('(username)', username), sender)
  } else {
    let diff = moment.preciseDiff(user.time.follow, moment(), true)
    let output = []
    if (diff.years) output.push(diff.years + ' ' + global.parser.getLocalizedName(diff.years, 'core.years'))
    if (diff.months) output.push(diff.months + ' ' + global.parser.getLocalizedName(diff.months, 'core.months'))
    if (diff.days) output.push(diff.days + ' ' + global.parser.getLocalizedName(diff.days, 'core.days'))
    if (diff.hours) output.push(diff.hours + ' ' + global.parser.getLocalizedName(diff.hours, 'core.hours'))
    global.commons.sendMessage(global.translate('followage.success.time')
      .replace('(username)', username)
      .replace('(diff)', output.join(', ')), sender)
  }
}

Twitch.prototype.lastseen = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    const user = global.users.get(parsed[0])
    if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.message)) {
      global.commons.sendMessage(global.translate('lastseen.success.never').replace('(username)', parsed[0]), sender)
    } else {
      global.commons.sendMessage(global.translate('lastseen.success.time')
        .replace('(username)', parsed[0])
        .replace('(when)', moment.unix(user.time.message / 1000).format('DD-MM-YYYY HH:mm:ss')), sender)
    }
  } catch (e) {
    global.commons.sendMessage(global.translate('lastseen.failed.parse'), sender)
  }
}

Twitch.prototype.watched = function (self, sender, text) {
  try {
    let watched, parsed
    parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    const user = global.users.get(text.trim() < 1 ? sender.username : parsed[0])
    watched = parseInt(!_.isNil(user) && !_.isNil(user.time) && !_.isNil(user.time.watched) ? user.time.watched : 0) / 1000 / 60 / 60
    global.commons.sendMessage(global.translate('watched.success.time')
      .replace('(time)', watched.toFixed(1))
      .replace('(username)', '@' + user.username), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('watched.failed.parse'), sender)
  }
}

Twitch.prototype.showMe = function (self, sender, text) {
  try {
    const user = global.users.get(sender.username)
    var message = ['@' + sender.username]
    // rank
    var rank = !_.isUndefined(user.rank) ? user.rank : null
    if (global.configuration.get().systems.ranks === true && !_.isNull(rank)) message.push(rank)

    // watchTime
    var watchTime = _.isFinite(parseInt(user.time.watched, 10)) && _.isNumber(parseInt(user.time.watched, 10)) ? user.time.watched : 0
    message.push((watchTime / 1000 / 60 / 60).toFixed(1) + 'h')

    // points
    var points = !_.isUndefined(user.points) ? user.points : 0
    if (global.configuration.get().systems.points === true) message.push(points + ' ' + global.systems.points.getPointsName(points))

    // message count
    var messages = !_.isUndefined(user.stats.messages) ? user.stats.messages : 0
    message.push(messages + ' messages')

    global.commons.sendMessage(message.join(' | '), sender)
  } catch (e) {
    global.log.error(e, { fnc: 'Twitch.prototype.showMe' })
  }
}

Twitch.prototype.showTop = function (self, sender, text) {
  try {
    let sorted, message
    let type = text.trim().match(/^(time|points)$/)

    if (_.isNil(type)) type = 'time'
    else type = type[1]

    if (type === 'points' && global.commons.isSystemEnabled('points')) {
      sorted = _.orderBy(_.filter(global.users.users, function (o) { return !_.isNil(o.points) && !global.parser.isOwner(o.username) && o.username !== global.configuration.get().twitch.username }), 'points', 'desc')
    } else {
      sorted = _.orderBy(_.filter(global.users.users, function (o) { return !_.isNil(o.time.watched) && !global.parser.isOwner(o.username) && o.username !== global.configuration.get().twitch.username }), 'time.watched', 'desc')
    }

    sorted = _.chunk(_.map(sorted, 'username'), 10)[0]

    message = global.translate(type === 'points' ? 'top.listPoints' : 'top.listWatched').replace('(amount)', 10)
    _.each(sorted, function (username, index) {
      message += (index + 1) + '. @' + username + ' - '
      if (type === 'time') message += (global.users.get(username).time.watched / 1000 / 60 / 60).toFixed(1) + 'h'
      else message += global.users.get(username).points + ' ' + global.systems.points.getPointsName(global.users.get(username).points)
      if (index + 1 < 10) message += ', '
    })
    global.commons.sendMessage(message, sender)
  } catch (e) {
    console.log(e)
    global.log.error(e)
  }
}

Twitch.prototype.setTitleAndGame = function (self, sender, title = null, game = null) {
  global.client.api({
    url: 'https://api.twitch.tv/kraken/channels/' + global.channelId,
    json: true,
    qs: {
      _method: 'put',
      channel: {
        game: !_.isNull(game) ? game : self.currentGame,
        status: !_.isNull(title) ? title : self.currentStatus
      }
    },
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      Authorization: 'OAuth ' + global.configuration.get().twitch.password.split(':')[1],
      'Client-ID': global.configuration.get().twitch.clientId
    }
  }, function (err, res, body) {
    if (err) { return global.log.error(err, { fnc: 'Twitch.prototype.setTitleAndGame' }) }

    if (!_.isNull(game)) {
      if (body.game === game.trim()) {
        global.commons.sendMessage(global.translate('game.change.success')
          .replace('(game)', body.game), sender)
        self.currentGame = body.game
      } else {
        global.commons.sendMessage(global.translate('game.change.failed')
          .replace('(game)', body.game), sender)
      }
    }

    if (!_.isNull(title)) {
      if (body.status === title.trim()) {
        global.commons.sendMessage(global.translate('title.change.success')
          .replace('(status)', body.status), sender)
        self.currentStatus = body.status
      } else {
        global.commons.sendMessage(global.translate('title.change.failed')
          .replace('(status)', body.status), sender)
      }
    }
  })
}

Twitch.prototype.setTitle = function (self, sender, text) {
  if (text.trim().length === 0) {
    global.commons.sendMessage(global.translate('title.current')
      .replace('(title)', self.currentStatus), sender)
    return
  }
  self.setTitleAndGame(self, sender, text, null)
}

Twitch.prototype.setGame = function (self, sender, text) {
  if (text.trim().length === 0) {
    global.commons.sendMessage(global.translate('game.current')
      .replace('(game)', self.currentGame), sender)
    return
  }
  self.setTitleAndGame(self, sender, null, text)
}

Twitch.prototype.sendGameFromTwitch = function (self, socket, game) {
  global.client.api({
    url: 'https://api.twitch.tv/kraken/search/games?query=' + encodeURIComponent(game) + '&type=suggest',
    json: true,
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Client-ID': global.configuration.get().twitch.clientId
    }
  }, function (err, res, body) {
    if (err) { return global.log.error(err, { fnc: 'Twitch.prototype.sendGameFromTwitch' }) }
    if (_.isNull(body.games)) {
      socket.emit('sendGameFromTwitch', false)
    } else {
      socket.emit('sendGameFromTwitch', _.map(body.games, 'name'))
    }
  })
}

Twitch.prototype.deleteUserTwitchGame = function (self, socket, game) {
  delete self.cGamesTitles[game]
  self.sendUserTwitchGamesAndTitles(self, socket)
}

Twitch.prototype.deleteUserTwitchTitle = function (self, socket, data) {
  _.remove(self.cGamesTitles[data.game], function (aTitle) {
    return aTitle === data.title
  })
  self.sendUserTwitchGamesAndTitles(self, socket)
}

Twitch.prototype.sendUserTwitchGamesAndTitles = function (self, socket) {
  socket.emit('sendUserTwitchGamesAndTitles', self.cGamesTitles)
}

Twitch.prototype.updateGameAndTitle = function (self, socket, data) {
  self.setTitleAndGame(self, null, data.title, data.game)

  if (_.isUndefined(self.cGamesTitles[data.game])) { // create key if doesnt exists
    self.cGamesTitles[data.game] = []
  }

  if (self.cGamesTitles[data.game].indexOf(data.title) === -1) { // if unique
    self.cGamesTitles[data.game].push(data.title) // also, we need to add game and title to cached property
  }
  self.sendStats(self, global.panel.io) // force dashboard update
}

module.exports = Twitch
