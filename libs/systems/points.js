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
      this.updatePoints()
      this.compactPointsDb()
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
  self.setPoints(self, {username: config.settings.bot_username.toLowerCase()}, data.username + ' ' + data.value) // we want to show this in chat
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

Points.prototype.messagePoints = async function (self, sender, text, skip) {
  if (skip || text.startsWith('!')) return true

  const points = parseInt(await global.configuration.getValue('pointsPerMessageInterval'), 10)
  const interval = parseInt(await global.configuration.getValue('pointsMessageInterval'), 10)
  const user = await global.users.get(sender.username)
  if (points === interval === 0) return
  let lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints

  if (lastMessageCount + interval <= user.stats.messages) {
    await global.db.engine.insert('users.points', { username: user.username, points: parseInt(points, 10) })
    await global.db.engine.update('users', { username: user.username }, { custom: { lastMessagePoints: user.stats.messages } })
  }
  return true
}

Points.prototype.getPointsOf = async function (user) {
  let points = 0
  for (let item of await global.db.engine.find('users.points', { username: user })) {
    let itemPoints = !_.isNaN(parseInt(_.get(item, 'points', 0))) ? parseInt(_.get(item, 'points', 0)) : 0
    points = parseInt(points) + itemPoints
  }
  return points
}

Points.prototype.setPoints = async function (self, sender, text) {
  try {
    var parsed = text.match(/^@?([\S]+) ([0-9]+)$/)
    const points = parseInt(parsed[2], 10)

    let userPoints = await self.getPointsOf(parsed[1].toLowerCase())
    await global.db.engine.insert('users.points', { username: parsed[1].toLowerCase(), points: points - userPoints })

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
    var givePts = parsed[2] === 'all' ? await self.getPointsOf(sender.username) : parsed[2]
    if (await self.getPointsOf(sender.username) >= givePts) {
      if (user.username !== user2.username) {
        await global.db.engine.insert('users.points', { username: user.username, points: (parseInt(givePts, 10) * -1) })
        await global.db.engine.insert('users.points', { username: user2.username, points: parseInt(givePts, 10) })
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
    const username = text.match(/^@?([\S]+)$/)[1] || sender.username

    let points = await self.getPointsOf(username)
    let message = await global.commons.prepare('points.defaults.pointsResponse', {
      amount: points,
      username: username,
      pointsName: await self.getPointsName(points)
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

    let users = await global.db.engine.find('users.online')
    for (let user of users) {
      await global.db.engine.insert('users.points', { username: user.username, points: parseInt(givePts, 10) })
    }
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

    let users = await global.db.engine.find('users.online')
    for (let user of users) {
      await global.db.engine.insert('users.points', { username: user.username, points: parseInt(Math.floor(Math.random() * givePts), 10) })
    }
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
    await global.db.engine.insert('users.points', { username: parsed[1].toLowerCase(), points: givePts })

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
    var removePts = parsed[2] === 'all' ? await self.getPointsOf(parsed[1]) : parsed[2]
    await global.db.engine.insert('users.points', { username: parsed[1].toLowerCase(), points: removePts * -1 })

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

Points.prototype.updatePoints = async function () {
  try {
    var interval = (await global.cache.isOnline() ? await global.configuration.getValue('pointsInterval') * 60 * 1000 : await global.configuration.getValue('pointsIntervalOffline') * 60 * 1000)
    var ptsPerInterval = (await global.cache.isOnline() ? await global.configuration.getValue('pointsPerInterval') : await global.configuration.getValue('pointsPerIntervalOffline'))

    if (parseInt(interval, 10) === 0 || parseInt(ptsPerInterval, 10) === 0) return

    for (let user of await global.db.engine.find('users.online')) {
      if (global.commons.isBot(user.username)) continue

      user = await global.db.engine.findOne('users', { username: user.username })
      _.set(user, 'time.points', _.get(user, 'time.points', new Date().getTime() - interval))

      let time = new Date().getTime()
      let userTimeDiff = time - user.time.points
      let howManyInc = userTimeDiff / interval
      for (let i = 1; i <= howManyInc; howManyInc--) { // starting with 1, because 0.2 should not add points
        await global.db.engine.insert('users.points', { username: user.username, points: parseInt(ptsPerInterval, 10) })
      }
      await global.db.engine.update('users', { username: user.username }, { time: { points: time - (userTimeDiff * howManyInc) } })
    }
  } catch (e) {
    global.db.error(e)
    global.db.error(e.stack)
  } finally {
    setTimeout(() => this.updatePoints(), 60000)
  }
}

Points.prototype.compactPointsDb = async function () {
  try {
    let users = {}
    for (let user of await global.db.engine.find('users.points')) {
      if (_.isNaN(users[user.username]) || _.isNil(users[user.username])) users[user.username] = 0
      let points = !_.isNaN(parseInt(_.get(user, 'points', 0))) ? parseInt(_.get(user, 'points', 0)) : 0
      users[user.username] = parseInt(users[user.username], 10) + points
      await global.db.engine.remove('users.points', { _id: user._id.toString() })
    }
    for (let [username, points] of Object.entries(users)) {
      await global.db.engine.insert('users.points', { username: username, points: parseInt(points, 10) })
    }
  } catch (e) {
    global.db.error(e)
    global.db.error(e.stack)
  } finally {
    setTimeout(() => this.compactPointsDb(), 60000)
  }
}

module.exports = new Points()
