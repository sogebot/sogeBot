'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:points')

// bot libraries
const config = require('../../config.json')
const constants = require('../constants')

function Points () {
  if (global.commons.isSystemEnabled(this)) {
    if (require('cluster').isMaster) {
      // add events for join/part
      setTimeout(() => this.addEvents(this), 1000)
      // count Points - every 30s check points
      setInterval(() => this.updatePoints(), 30000)

      this.webPanel()
    }

    // default is <singular>|<plural> | in some languages can be set with custom <singular>|<x:multi>|<plural> where x <= 10
    global.configuration.register('pointsName', 'points.settings.pointsName', 'string', '')
    global.configuration.register('pointsInterval', 'points.settings.pointsInterval', 'number', 10)
    global.configuration.register('pointsPerInterval', 'points.settings.pointsPerInterval', 'number', 1)
    global.configuration.register('pointsIntervalOffline', 'points.settings.pointsIntervalOffline', 'number', 30)
    global.configuration.register('pointsPerIntervalOffline', 'points.settings.pointsPerIntervalOffline', 'number', 1)
    global.configuration.register('pointsMessageInterval', 'points.settings.pointsMessageInterval', 'number', 5)
    global.configuration.register('pointsPerMessageInterval', 'points.settings.pointsPerMessageInterval', 'number', 1)
  }
}

Points.prototype.commands = function () {
  return !global.commons.isSystemEnabled('points')
    ? []
    : [
      {this: this, command: '!points add', fnc: this.addPoints, permission: constants.OWNER_ONLY},
      {this: this, command: '!points remove', fnc: this.removePoints, permission: constants.OWNER_ONLY},
      {this: this, command: '!points all', fnc: this.allPoints, permission: constants.OWNER_ONLY},
      {this: this, command: '!points set', fnc: this.setPoints, permission: constants.OWNER_ONLY},
      {this: this, command: '!points get', fnc: this.getPointsFromUser, permission: constants.OWNER_ONLY},
      {this: this, command: '!points give', fnc: this.givePoints, permission: constants.VIEWERS},
      {this: this, command: '!makeitrain', fnc: this.rainPoints, permission: constants.OWNER_ONLY},
      {this: this, command: '!points', fnc: this.getPoints, permission: constants.VIEWERS}
    ]
}

Points.prototype.parsers = function () {
  return !global.commons.isSystemEnabled('points')
    ? []
    : [
      {this: this, name: 'points', fnc: this.messagePoints, permission: constants.VIEWERS, priority: constants.LOWEST}
    ]
}

Points.prototype.webPanel = function () {
  global.panel.socketListening(this, 'setPoints', this.setSocket)
  global.panel.socketListening(this, 'getPointsConfiguration', this.sendConfiguration)
  global.panel.socketListening(this, 'resetPoints', this.resetPoints)
}

Points.prototype.setSocket = function (self, socket, data) {
  self.setPoints(self, {username: config.settings.bot_username}, data.username + ' ' + data.value) // we want to show this in chat
}

Points.prototype.resetPoints = function (self, socket, data) {
  global.users.setAll({points: 0})
}

Points.prototype.sendConfiguration = async function (self, socket) {
  var pointsNames
  if (await global.configuration.getValue('pointsName').length === 0) {
    pointsNames = []
    pointsNames.push(global.translate('points.defaults.pointsName.single'))
    if (global.translate('points.defaults.pointsName.xmulti').indexOf('missing_translation') === -1) {
      pointsNames.push(global.translate('points.defaults.pointsName.xmulti'))
    }
    pointsNames.push(global.translate('points.defaults.pointsName.multi'))
    pointsNames = pointsNames.join('|')
  } else {
    pointsNames = await global.configuration.getValue('pointsName')
  }

  socket.emit('pointsConfiguration', {
    pointsName: pointsNames,
    pointsInterval: await global.configuration.getValue('pointsInterval'),
    pointsPerInterval: await global.configuration.getValue('pointsPerInterval'),
    pointsIntervalOffline: await global.configuration.getValue('pointsIntervalOffline'),
    pointsPerIntervalOffline: await global.configuration.getValue('pointsPerIntervalOffline'),
    pointsMessageInterval: await global.configuration.getValue('pointsMessageInterval'),
    pointsPerMessageInterval: await global.configuration.getValue('pointsPerMessageInterval')
  })
}

Points.prototype.addEvents = function (self) {
  global.client.on('join', function (channel, username, fromSelf) {
    if (!fromSelf) {
      self.startCounting(username)
    }
  })
}

Points.prototype.messagePoints = async function (self, sender, text, skip) {
  if (skip || text.startsWith('!')) return true

  const points = parseInt(global.configuration.getValue('pointsPerMessageInterval'), 10)
  const interval = parseInt(global.configuration.getValue('pointsMessageInterval'), 10)
  const user = await global.users.get(sender.username)

  let lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints

  if (lastMessageCount + interval <= user.stats.messages) {
    await Promise.all([
      global.db.engine.increment('users', { username: user.username }, { points: parseInt(points, 10) }),
      global.db.engine.update('users', { username: user.username }, { custom: { lastMessagePoints: user.stats.messages } })
    ])
  }
  return true
}

Points.prototype.setPoints = async function (self, sender, text) {
  try {
    var parsed = text.match(/^@?([\S]+) ([0-9]+)$/)
    const points = parseInt(parsed[2], 10)

    global.users.set(parsed[1].toLowerCase(), { points: points })
    let message = await global.commons.prepare('points.success.set', {
      amount: points,
      username: parsed[1].toLowerCase(),
      pointsName: await self.getPointsName(points)
    })
    debug(message); global.commons.sendMessage(message, sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.set'), sender)
  }
}

Points.prototype.givePoints = async function (self, sender, text) {
  try {
    var parsed = text.match(/^@?([\S]+) ([\d]+|all)$/)
    const [user, user2] = await Promise.all([global.users.get(sender.username), global.users.get(parsed[1])])
    var givePts = parsed[2] === 'all' && !_.isNil(user.points) ? user.points : parsed[2]
    if (parseInt(user.points, 10) >= givePts) {
      if (user.username !== user2.username) {
        global.db.engine.increment('users', { username: user.username }, { points: (parseInt(givePts, 10) * -1) })
        global.db.engine.increment('users', { username: user2.username }, { points: parseInt(givePts, 10) })
      }
      let message = await global.commons.prepare('points.success.give', {
        amount: givePts,
        username: user2.username,
        pointsName: await self.getPointsName(givePts)
      })
      debug(message); global.commons.sendMessage(message, sender)
    } else {
      let message = await global.commons.prepare('points.failed.giveNotEnough', {
        amount: givePts,
        username: user2.username,
        pointsName: await self.getPointsName(givePts)
      })
      debug(message); global.commons.sendMessage(message, sender)
    }
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.give'), sender)
  }
}

Points.prototype.getPointsName = async function (points) {
  var pointsNames = (await global.configuration.getValue('pointsName')).split('|').map(Function.prototype.call, String.prototype.trim)
  var single, multi, xmulti
  // get single|x:multi|multi from pointsName
  if ((await global.configuration.getValue('pointsName')).length === 0) {
    xmulti = global.translate('points.defaults.pointsName.xmulti')
    single = global.translate('points.defaults.pointsName.single')
    multi = global.translate('points.defaults.pointsName.multi')
  } else {
    switch (pointsNames.length) {
      case 1:
        xmulti = null
        single = multi = pointsNames[0]
        break
      case 2:
        single = pointsNames[0]
        multi = pointsNames[1]
        xmulti = null
        break
      default:
        var len = pointsNames.length
        single = pointsNames[0]
        multi = pointsNames[len - 1]
        xmulti = {}

        for (var pattern in pointsNames) {
          pattern = parseInt(pattern, 10)
          if (pointsNames.hasOwnProperty(pattern) && pattern !== 0 && pattern !== len - 1) {
            var maxPts = pointsNames[pattern].split(':')[0]
            var name = pointsNames[pattern].split(':')[1]
            xmulti[maxPts] = name
          }
        }
        break
    }
  }

  var pointsName = (points === 1 ? single : multi)
  if (!_.isNull(xmulti) && _.isObject(xmulti) && points > 1 && points <= 10) {
    for (var i = points; i <= 10; i++) {
      if (typeof xmulti[i] === 'string') {
        pointsName = xmulti[i]
        break
      }
    }
  }
  return pointsName
}

Points.prototype.getPointsFromUser = async function (self, sender, text) {
  try {
    let user = await global.users.get(sender.username)
    const username = text.match(/^@?([\S]+)$/)[1]

    let message = await global.commons.prepare('points.defaults.pointsResponse', {
      amount: user.points,
      username: username,
      pointsName: await self.getPointsName(user.points)
    })
    debug(message); global.commons.sendMessage(message, sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.get'), sender)
  }
}

Points.prototype.allPoints = async function (self, sender, text) {
  try {
    var parsed = text.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)

    let users = await global.users.getAll({ is: { online: true } })
    _.each(users, function (user) {
      global.db.engine.increment('users', { username: user.username }, { points: parseInt(givePts, 10) })
    })
    let message = await global.commons.prepare('points.success.all', {
      amount: givePts,
      pointsName: await self.getPointsName(givePts)
    })
    debug(message); global.commons.sendMessage(message, sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.all'), sender)
  }
}

Points.prototype.rainPoints = async function (self, sender, text) {
  try {
    var parsed = text.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)

    let users = await global.users.getAll({ is: { online: true } })
    _.each(users, function (user) {
      global.db.engine.increment('users', { username: user.username }, { points: parseInt(Math.floor(Math.random() * givePts), 10) })
    })
    let message = await global.commons.prepare('points.success.rain', {
      amount: givePts,
      pointsName: await self.getPointsName(givePts)
    })
    debug(message); global.commons.sendMessage(message, sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.rain'), sender)
  }
}

Points.prototype.addPoints = async function (self, sender, text) {
  try {
    var parsed = text.match(/^@?([\S]+) ([0-9]+)$/)
    let givePts = parseInt(parsed[2], 10)
    global.db.engine.increment('users', { username: parsed[1].toLowerCase() }, { points: givePts })

    let message = await global.commons.prepare('points.success.add', {
      amount: givePts,
      username: parsed[1].toLowerCase(),
      pointsName: await self.getPointsName(givePts)
    })
    debug(message); global.commons.sendMessage(message, sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.add'), sender)
  }
}

Points.prototype.removePoints = async function (self, sender, text) {
  try {
    var parsed = text.match(/^@?([\S]+) ([\d]+|all)$/)
    const user = await global.users.get(parsed[1])
    let removePts = parsed[2] === 'all' && !_.isNil(user.points) ? user.points : parsed[2]

    global.db.engine.increment('users', { username: parsed[1].toLowerCase() }, { points: (removePts * -1) })

    let message = await global.commons.prepare('points.success.remove', {
      amount: removePts,
      username: parsed[1].toLowerCase(),
      pointsName: await self.getPointsName(removePts)
    })
    debug(message); global.commons.sendMessage(message, sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.remove'), sender)
  }
}

Points.prototype.getPoints = function (self, sender) {
  self.getPointsFromUser(self, sender, sender.username)
}

Points.prototype.startCounting = function (username) {
  global.users.set(username, { time: { points: parseInt(new Date().getTime(), 10) } })
}

Points.prototype.updatePoints = async function () {
  var interval = (await global.cache.isOnline() ? global.configuration.getValue('pointsInterval') * 60 * 1000 : await global.configuration.getValue('pointsIntervalOffline') * 60 * 1000)
  var ptsPerInterval = (await global.cache.isOnline() ? global.configuration.getValue('pointsPerInterval') : await global.configuration.getValue('pointsPerIntervalOffline'))

  let users = await global.users.getAll({ is: { online: true } })
  for (let user of users) {
    _.set(user, 'time.points', _.get(user, 'time.points', 0))
    if (new Date().getTime() - user.time.points >= interval) {
      await Promise.all([
        global.db.engine.increment('users', { username: user.username }, { points: parseInt(ptsPerInterval, 10) }),
        global.db.engine.update('users', { username: user.username }, { time: { points: new Date().getTime() } })
      ])
    }
  }
}

module.exports = new Points()
