'use strict'

var constants = require('./constants')
var moment = require('moment')
var request = require('request-promise')
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
    followers: [],
    subscribers: [],
    hosts: []
  }

  this.when = {
    online: null,
    offline: null
  }

  this.cGamesTitles = {} // cached Games and Titles
  global.watcher.watch(this, 'cGamesTitles', this._save)
  global.watcher.watch(this, 'when', this._save)
  global.watcher.watch(this, 'cached', this._save)
  this._load(this)

  var self = this
  setInterval(function () {
    let options = {
      url: 'https://api.twitch.tv/kraken/streams/' + global.channelId,
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }

    if (global.configuration.get().bot.debug) {
      global.log.debug('Get current stream data from twitch', options)
    }
    global.client.api(options, function (err, res, body) {
      if (err) {
        if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#1' })
        return
      }

      if (global.configuration.get().bot.debug) {
        global.log.debug('Response: Get current stream data from twitch', body)
      }

      if (res.statusCode === 200 && !_.isNull(body.stream)) {
        self.curRetries = 0
        if (!self.isOnline) { // if we are switching from offline - bots restarts? We want refresh to correct data for start as well
          self.chatMessagesAtStart = global.parser.linesParsed
          self.currentViewers = 0
          self.maxViewers = 0
          self.newChatters = 0
          self.chatMessagesAtStart = global.parser.linesParsed
          global.events.fire('stream-started')
          global.events.fire('every-x-seconds', { reset: true })
        }
        self.saveStream(body.stream)
        self.isOnline = true
        self.when.offline = null
        global.events.fire('number-of-viewers-is-at-least-x')
        global.events.fire('stream-is-running-x-minutes')
        global.events.fire('every-x-seconds')
      } else {
        if (self.isOnline && self.curRetries < self.maxRetries) { self.curRetries = self.curRetries + 1; return } // we want to check if stream is _REALLY_ offline
        // reset everything
        self.curRetries = 0
        self.isOnline = false
        if (_.isNil(self.when.offline)) {
          self.when.offline = new Date().getTime()
          global.events.fire('stream-stopped')
          global.events.fire('stream-is-running-x-minutes', { reset: true })
          global.events.fire('number-of-viewers-is-at-least-x', { reset: true })
        }
        self.when.online = null
      }
    })

    options = {
      url: 'https://api.twitch.tv/kraken/channels/' + global.channelId + '/follows?limit=100',
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }
    if (global.configuration.get().bot.debug) {
      global.log.debug('Get last 100 followers from twitch', options)
    }
    global.client.api(options, function (err, res, body) {
      if (err) {
        if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#2' })
        return
      }
      if (global.configuration.get().bot.debug) {
        global.log.debug('Response: Get last 100 followers from twitch', body)
      }
      if (res.statusCode === 200 && !_.isNull(body)) {
        self.currentFollowers = body._total

        self.cached.followers = []
        _.each(body.follows, function (follower) {
          if (!global.users.get(follower.user.name).is.follower) {
            if (new Date().getTime() - moment(follower.created_at).format('X') * 1000 < 60000 * 60) global.events.fire('follow', { username: follower.user.name })
          }
          global.users.set(follower.user.name, { id: follower.user._id, is: { follower: true }, time: { followCheck: new Date().getTime(), follow: moment(follower.created_at).format('X') * 1000 } })
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
    let options = {
      url: 'https://api.twitch.tv/kraken/channels/' + global.channelId + '?timestamp=' + new Date().getTime(),
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }
    if (global.configuration.get().bot.debug) {
      global.log.debug('Get current channel data from twitch', options)
    }
    global.client.api(options, function (err, res, body) {
      if (err) {
        if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#3' })
        return
      }
      if (global.configuration.get().bot.debug) {
        global.log.debug('Response: Get current channel data from twitch', body)
      }
      if (res.statusCode === 200 && !_.isNull(body)) {
        self.currentGame = body.game
        self.currentStatus = body.status
        self.currentViews = body.views
      }
    })

    if (!_.isNull(global.channelId)) {
      options = {
        url: 'http://tmi.twitch.tv/hosts?include_logins=1&target=' + global.channelId
      }
      if (global.configuration.get().bot.debug) {
        global.log.debug('Get current hosts', options)
      }
      global.client.api(options, function (err, res, body) {
        if (err) {
          if (err.code !== 'ETIMEDOUT' && err.code !== 'ECONNRESET') global.log.error(err, { fnc: 'Twitch#4' })
          return
        }
        if (global.configuration.get().bot.debug) {
          global.log.debug('Response: Get current hosts', body)
        }
        if (res.statusCode === 200 && !_.isNull(body)) {
          self.currentHosts = body.hosts.length
          if (self.currentHosts > 0) {
            _.each(body.hosts, function (host) {
              if (!_.includes(self.cached.hosts, host.host_login)) {
                global.events.fire('hosted', { username: host.host_login })
              }
            })

            // re-cache hosts
            self.cached.hosts = []
            _.each(body.hosts, function (host) { self.cached.hosts.push(host.host_login) })
          } else {
            self.cached.hosts = []
          }
        }
      })
    }

    options = {
      url: 'https://api.twitch.tv/kraken',
      headers: {
        'Client-ID': global.configuration.get().twitch.clientId
      }
    }
    if (global.configuration.get().bot.debug) {
      global.log.debug('Get API connection status', options)
    }
    global.client.api(options, function (err, res, body) {
      if (err) {
        global.status.API = constants.DISCONNECTED
        return
      }
      if (global.configuration.get().bot.debug) {
        global.log.debug('Response: Get API connection status', body)
      }
      global.status.API = res.statusCode === 200 ? constants.CONNECTED : constants.DISCONNECTED
    })
  }, 10000)

  global.parser.register(this, '!uptime', this.uptime, constants.VIEWERS)
  global.parser.register(this, '!lastseen', this.lastseen, constants.VIEWERS)
  global.parser.register(this, '!watched', this.watched, constants.VIEWERS)
  global.parser.register(this, '!followage', this.followage, constants.VIEWERS)
  global.parser.register(this, '!age', this.age, constants.VIEWERS)
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
  global.botDB.findOne({ _id: 'when' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: 'Twitch.prototype._load#2' })
    if (_.isNull(item)) return
    self.when = item
  })
  global.botDB.findOne({ _id: 'cached' }, function (err, item) {
    if (err) return global.log.error(err, { fnc: 'Twitch.prototype._load#3' })
    if (_.isNull(item)) return
    self.cached = item
  })
}

Twitch.prototype._save = function (self) {
  var cachedGamesTitles = self.cGamesTitles
  cachedGamesTitles._id = 'cachedGamesTitles'
  global.botDB.remove({ _id: cachedGamesTitles._id })
  global.botDB.insert(cachedGamesTitles)
  global.botDB.update({ _id: 'when' }, { $set: self.when }, { upsert: true })
  global.botDB.update({ _id: 'cached' }, { $set: self.cached }, { upsert: true })
  self.timestamp = new Date().getTime()
}

Twitch.prototype.saveStream = function (stream) {
  this.currentViewers = stream.viewers
  if (_.isNil(this.when.online)) this.when.online = stream.created_at
  this.maxViewers = this.maxViewers < this.currentViewers ? this.currentViewers : this.maxViewers

  var messages = global.parser.linesParsed - this.chatMessagesAtStart
  global.stats.save({
    timestamp: new Date().getTime(),
    whenOnline: this.when.online,
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
    uptime: self.getTime(self.when.online, false),
    currentViewers: self.currentViewers,
    maxViewers: self.maxViewers,
    chatMessages: messages,
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

Twitch.prototype.getTime = function (time, isChat) {
  var now, days, hours, minutes, seconds
  now = _.isNull(time) || !time ? {days: 0, hours: 0, minutes: 0, seconds: 0} : moment().preciseDiff(time, true)
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
  const time = self.getTime(self.isOnline ? self.when.online : self.when.offline, true)
  global.commons.sendMessage(global.translate(self.isOnline ? 'core.online' : 'core.offline')
    .replace('(time)', global.configuration.getValue('uptimeFormat')
    .replace('(days)', time.days)
    .replace('(hours)', time.hours)
    .replace('(minutes)', time.minutes)
    .replace('(seconds)', time.seconds)), sender)
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
  if (parsed[0].length > 0) username = parsed[0].toLowerCase()
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

Twitch.prototype.age = function (self, sender, text) {
  let username
  let parsed = text.match(/^(\S?)+$/g)
  if (parsed[0].length > 0) username = parsed[0].toLowerCase()
  else username = sender.username

  const user = global.users.get(username)
  if (_.isNil(user) || _.isNil(user.time) || _.isNil(user.time.created_at)) {
    global.commons.sendMessage(global.translate('age.failed').replace('(username)', username), sender)
  } else {
    let diff = moment.preciseDiff(user.time.created_at, moment(), true)
    let output = []
    if (diff.years) output.push(diff.years + ' ' + global.parser.getLocalizedName(diff.years, 'core.years'))
    if (diff.months) output.push(diff.months + ' ' + global.parser.getLocalizedName(diff.months, 'core.months'))
    if (diff.days) output.push(diff.days + ' ' + global.parser.getLocalizedName(diff.days, 'core.days'))
    if (diff.hours) output.push(diff.hours + ' ' + global.parser.getLocalizedName(diff.hours, 'core.hours'))
    global.commons.sendMessage(global.translate(sender.username.toLowerCase() !== username.toLowerCase() ? 'age.success.withUsername' : 'age.success.withoutUsername')
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

    let username = (global.configuration.getValue('atUsername') ? '@' : '') + user.username
    global.commons.sendMessage(global.translate('watched.success.time')
      .replace('(time)', watched.toFixed(1))
      .replace('(username)', username), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('watched.failed.parse'), sender)
  }
}

Twitch.prototype.showMe = function (self, sender, text) {
  try {
    const user = global.users.get(sender.username)
    var message = ['(sender)']
    // rank
    var rank = !_.isUndefined(user.rank) ? user.rank : null
    rank = !_.isNil(user.custom.rank) ? user.custom.rank : rank
    if (global.configuration.get().systems.ranks === true && !_.isNull(rank)) message.push(rank)

    // watchTime
    var watchTime = _.isFinite(parseInt(user.time.watched, 10)) && _.isNumber(parseInt(user.time.watched, 10)) ? user.time.watched : 0
    message.push((watchTime / 1000 / 60 / 60).toFixed(1) + 'h')

    // points
    var points = !_.isUndefined(user.points) ? user.points : 0
    if (global.configuration.get().systems.points === true) message.push(points + ' ' + global.systems.points.getPointsName(points))

    // message count
    var messages = !_.isUndefined(user.stats.messages) ? user.stats.messages : 0
    message.push(messages + ' ' + global.parser.getLocalizedName(messages, 'core.messages'))

    global.commons.sendMessage(message.join(' | '), sender)
  } catch (e) {
    global.log.error(e, { fnc: 'Twitch.prototype.showMe' })
  }
}

Twitch.prototype.showTop = function (self, sender, text) {
  try {
    let sorted, message
    let type = text.trim().match(/^(time|points|messages)$/)

    if (_.isNil(type)) type = 'time'
    else type = type[1]

    if (type === 'points' && global.commons.isSystemEnabled('points')) {
      message = global.translate('top.listPoints').replace('(amount)', 10)
      sorted = _.orderBy(_.filter(global.users.users, function (o) { return !_.isNil(o.points) && !global.parser.isOwner(o.username) && o.username !== global.configuration.get().twitch.username }), 'points', 'desc')
    } else if (type === 'time') {
      message = global.translate('top.listWatched').replace('(amount)', 10)
      sorted = _.orderBy(_.filter(global.users.users, function (o) { return !_.isNil(o.time.watched) && !global.parser.isOwner(o.username) && o.username !== global.configuration.get().twitch.username }), 'time.watched', 'desc')
    } else {
      message = global.translate('top.listMessages').replace('(amount)', 10)
      sorted = _.orderBy(_.filter(global.users.users, function (o) { return !_.isNil(o.stats.messages) && !global.parser.isOwner(o.username) && o.username !== global.configuration.get().twitch.username }), 'stats.messages', 'desc')
    }

    sorted = _.chunk(_.map(sorted, 'username'), 10)[0]
    _.each(sorted, function (username, index) {
      message += (index + 1) + '. ' + (global.configuration.getValue('atUsername') ? '@' : '') + username + ' - '
      if (type === 'time') message += (global.users.get(username).time.watched / 1000 / 60 / 60).toFixed(1) + 'h'
      else if (type === 'points') message += global.users.get(username).points + ' ' + global.systems.points.getPointsName(global.users.get(username).points)
      else message += global.users.get(username).stats.messages
      if (index + 1 < 10 && !_.isNil(sorted[index + 1])) message += ', '
    })
    global.commons.sendMessage(message, sender)
  } catch (e) {
    console.log(e)
    global.log.error(e)
  }
}

Twitch.prototype.setTitleAndGame = async function (self, sender, args) {
  args = _.defaults(args, { title: null }, { game: null })

  const options = {
    url: 'https://api.twitch.tv/kraken/channels/' + global.channelId,
    json: true,
    method: 'PUT',
    body: {
      channel: {
        game: !_.isNull(args.game) ? args.game : self.currentGame,
        status: !_.isNull(args.title) ? args.title : self.currentStatus
      }
    },
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      Authorization: 'OAuth ' + global.configuration.get().twitch.password.split(':')[1]
    }
  }
  if (global.configuration.get().bot.debug) {
    global.log.debug('Updating game and title ', options)
  }

  try {
    const response = await request(options)
    if (global.configuration.get().bot.debug) {
      global.log.debug('Response: Updating game and title ', response)
    }

    if (!_.isNull(args.game)) {
      if (response.game === args.game.trim()) {
        global.commons.sendMessage(global.translate('game.change.success')
          .replace('(game)', response.game), sender)
        self.currentGame = response.game
      } else {
        global.commons.sendMessage(global.translate('game.change.failed')
          .replace('(game)', self.currentGame), sender)
      }
    }

    if (!_.isNull(args.title)) {
      if (response.status === args.title.trim()) {
        global.commons.sendMessage(global.translate('title.change.success')
          .replace('(status)', response.status), sender)
        self.currentStatus = response.status
      } else {
        global.commons.sendMessage(global.translate('title.change.failed')
          .replace('(status)', self.currentStatus), sender)
      }
    }
  } catch (e) {
    if (global.configuration.get().bot.debug) {
      global.log.debug('Response: Updating game and title ', e.message)
    }
  }
  /*
  global.client.api(options, function (err, res, body) {
    if (err) { return global.log.error(err, { fnc: 'Twitch.prototype.setTitleAndGame' }) }

    if (global.configuration.get().bot.debug) {
      global.log.debug('Response: Updating game and title ', body)
    }

    if (!_.isNull(args.game)) {
      if (body.game === args.game.trim()) {
        global.commons.sendMessage(global.translate('game.change.success')
          .replace('(game)', body.game), sender)
        self.currentGame = body.game
      } else {
        global.commons.sendMessage(global.translate('game.change.failed')
          .replace('(game)', self.currentGame), sender)
      }
    }

    if (!_.isNull(args.title)) {
      if (body.status === args.title.trim()) {
        global.commons.sendMessage(global.translate('title.change.success')
          .replace('(status)', body.status), sender)
        self.currentStatus = body.status
      } else {
        global.commons.sendMessage(global.translate('title.change.failed')
          .replace('(status)', self.currentStatus), sender)
      }
    }
  })
  */
}

Twitch.prototype.setTitle = function (self, sender, text) {
  if (text.trim().length === 0) {
    global.commons.sendMessage(global.translate('title.current')
      .replace('(title)', self.currentStatus), sender)
    return
  }
  self.setTitleAndGame(self, sender, { title: text })
}

Twitch.prototype.setGame = function (self, sender, text) {
  if (text.trim().length === 0) {
    global.commons.sendMessage(global.translate('game.current')
      .replace('(game)', self.currentGame), sender)
    return
  }
  self.setTitleAndGame(self, sender, { game: text })
}

Twitch.prototype.sendGameFromTwitch = function (self, socket, game) {
  const options = {
    url: 'https://api.twitch.tv/kraken/search/games?query=' + encodeURIComponent(game) + '&type=suggest',
    json: true,
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Client-ID': global.configuration.get().twitch.clientId
    }
  }

  if (global.configuration.get().bot.debug) {
    global.log.debug('Search game on twitch ', options)
  }

  global.client.api(options, function (err, res, body) {
    if (err) { return global.log.error(err, { fnc: 'Twitch.prototype.sendGameFromTwitch' }) }

    if (global.configuration.get().bot.debug) {
      global.log.debug('Response: Search game on twitch ', body)
    }

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
  self.setTitleAndGame(self, null, data)

  if (_.isUndefined(self.cGamesTitles[data.game])) { // create key if doesnt exists
    self.cGamesTitles[data.game] = []
  }

  if (self.cGamesTitles[data.game].indexOf(data.title) === -1) { // if unique
    self.cGamesTitles[data.game].push(data.title) // also, we need to add game and title to cached property
  }
  self.sendStats(self, global.panel.io) // force dashboard update
}

module.exports = Twitch
