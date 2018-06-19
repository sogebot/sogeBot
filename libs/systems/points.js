'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:points')

// bot libraries
const constants = require('../constants')
const Timeout = require('../timeout')

function Points () {
  this.timestamps = {}
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
      {this: this, id: '!points add', command: '!points add', fnc: this.addPoints, permission: constants.OWNER_ONLY},
      {this: this, id: '!points remove', command: '!points remove', fnc: this.removePoints, permission: constants.OWNER_ONLY},
      {this: this, id: '!points all', command: '!points all', fnc: this.allPoints, permission: constants.OWNER_ONLY},
      {this: this, id: '!points set', command: '!points set', fnc: this.setPoints, permission: constants.OWNER_ONLY},
      {this: this, id: '!points get', command: '!points get', fnc: this.getPointsFromUser, permission: constants.OWNER_ONLY},
      {this: this, id: '!points give', command: '!points give', fnc: this.givePoints, permission: constants.VIEWERS},
      {this: this, id: '!makeitrain', command: '!makeitrain', fnc: this.rainPoints, permission: constants.OWNER_ONLY},
      {this: this, id: '!points', command: '!points', fnc: this.getPoints, permission: constants.VIEWERS}
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
  global.panel.socketListening(this, 'getPointsConfiguration', this.sendConfiguration)
  global.panel.socketListening(this, 'resetPoints', this.resetPoints)
}

Points.prototype.resetPoints = function (self, socket, data) {
  global.db.engine.remove('users.points', {})
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
  if (points === 0 || interval === 0) return
  let lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints
  const userMessages = await global.users.getMessagesOf(sender.username)

  if (lastMessageCount + interval <= userMessages) {
    await global.db.engine.insert('users.points', { username: user.username, points: parseInt(points, 10) })
    await global.db.engine.update('users', { username: user.username }, { custom: { lastMessagePoints: userMessages } })
  }
  return true
}

Points.prototype.getPointsOf = async function (user) {
  let points = 0
  for (let item of await global.db.engine.find('users.points', { username: user })) {
    let itemPoints = !_.isNaN(parseInt(_.get(item, 'points', 0))) ? _.get(item, 'points', 0) : 0
    points = points + Number(itemPoints)
  }
  if (Number(points) < 0) points = 0

  return parseInt(
    Number(points) <= Number.MAX_SAFE_INTEGER / 1000000
      ? points
      : Number.MAX_SAFE_INTEGER / 1000000, 10)
}

Points.prototype.setPoints = async function (opts) {
  try {
    var parsed = opts.parameters.match(/^@?([\S]+) ([0-9]+)$/)
    const points = parseInt(
      Number(parsed[2]) <= Number.MAX_SAFE_INTEGER / 1000000
        ? parsed[2]
        : Number.MAX_SAFE_INTEGER / 1000000, 10)

    await global.db.engine.remove('users.points', { username: parsed[1].toLowerCase() })
    await global.db.engine.insert('users.points', { username: parsed[1].toLowerCase(), points })

    let message = await global.commons.prepare('points.success.set', {
      amount: points,
      username: parsed[1].toLowerCase(),
      pointsName: await this.getPointsName(points)
    })
    debug(message); global.commons.sendMessage(message, opts.sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.set'), opts.sender)
  }
}

Points.prototype.givePoints = async function (opts) {
  try {
    var parsed = opts.parameters.match(/^@?([\S]+) ([\d]+|all)$/)
    const [user, user2] = await Promise.all([global.users.get(opts.sender.username), global.users.get(parsed[1])])
    var givePts = parsed[2] === 'all' ? await this.getPointsOf(opts.sender.username) : parsed[2]
    if (await this.getPointsOf(opts.sender.username) >= givePts) {
      if (user.username !== user2.username) {
        await global.db.engine.insert('users.points', { username: user.username, points: (parseInt(givePts, 10) * -1) })
        await global.db.engine.insert('users.points', { username: user2.username, points: parseInt(givePts, 10) })
      }
      let message = await global.commons.prepare('points.success.give', {
        amount: givePts,
        username: user2.username,
        pointsName: await this.getPointsName(givePts)
      })
      debug(message); global.commons.sendMessage(message, opts.sender)
    } else {
      let message = await global.commons.prepare('points.failed.giveNotEnough', {
        amount: givePts,
        username: user2.username,
        pointsName: await this.getPointsName(givePts)
      })
      debug(message); global.commons.sendMessage(message, opts.sender)
    }
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.give'), opts.sender)
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

Points.prototype.getPointsFromUser = async function (opts) {
  try {
    const match = opts.parameters.match(/^@?([\S]+)$/)
    const username = !_.isNil(match) ? match[1] : opts.sender.username

    let points = await this.getPointsOf(username)
    let message = await global.commons.prepare('points.defaults.pointsResponse', {
      amount: points,
      username: username,
      pointsName: await this.getPointsName(points)
    })
    debug(message); global.commons.sendMessage(message, opts.sender)
  } catch (err) {
    console.log(err)
    global.commons.sendMessage(global.translate('points.failed.get'), opts.sender)
  }
}

Points.prototype.allPoints = async function (opts) {
  try {
    var parsed = opts.parameters.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)

    let users = await global.db.engine.find('users.online')
    for (let user of users) {
      await global.db.engine.insert('users.points', { username: user.username, points: parseInt(givePts, 10) })
    }
    let message = await global.commons.prepare('points.success.all', {
      amount: givePts,
      pointsName: await this.getPointsName(givePts)
    })
    debug(message); global.commons.sendMessage(message, opts.sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.all'), opts.sender)
  }
}

Points.prototype.rainPoints = async function (opts) {
  try {
    var parsed = opts.parameters.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)

    let users = await global.db.engine.find('users.online')
    for (let user of users) {
      await global.db.engine.insert('users.points', { username: user.username, points: parseInt(Math.floor(Math.random() * givePts), 10) })
    }
    let message = await global.commons.prepare('points.success.rain', {
      amount: givePts,
      pointsName: await this.getPointsName(givePts)
    })
    debug(message); global.commons.sendMessage(message, opts.sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.rain'), opts.sender)
  }
}

Points.prototype.addPoints = async function (opts) {
  try {
    var parsed = opts.parameters.match(/^@?([\S]+) ([0-9]+)$/)
    let givePts = parseInt(parsed[2], 10)
    await global.db.engine.insert('users.points', { username: parsed[1].toLowerCase(), points: givePts })

    let message = await global.commons.prepare('points.success.add', {
      amount: givePts,
      username: parsed[1].toLowerCase(),
      pointsName: await this.getPointsName(givePts)
    })
    debug(message); global.commons.sendMessage(message, opts.sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.add'), opts.sender)
  }
}

Points.prototype.removePoints = async function (opts) {
  try {
    var parsed = opts.parameters.match(/^@?([\S]+) ([\d]+|all)$/)
    var removePts = parsed[2] === 'all' ? await this.getPointsOf(parsed[1]) : parsed[2]
    await global.db.engine.insert('users.points', { username: parsed[1].toLowerCase(), points: removePts * -1 })

    let message = await global.commons.prepare('points.success.remove', {
      amount: removePts,
      username: parsed[1].toLowerCase(),
      pointsName: await this.getPointsName(removePts)
    })
    debug(message); global.commons.sendMessage(message, opts.sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.remove'), opts.sender)
  }
}

Points.prototype.getPoints = function (opts) {
  this.getPointsFromUser(opts)
}

Points.prototype.updatePoints = async function () {
  try {
    var interval = (await global.cache.isOnline() ? await global.configuration.getValue('pointsInterval') * 60 * 1000 : await global.configuration.getValue('pointsIntervalOffline') * 60 * 1000)
    var ptsPerInterval = (await global.cache.isOnline() ? await global.configuration.getValue('pointsPerInterval') : await global.configuration.getValue('pointsPerIntervalOffline'))

    for (let username of (await global.db.engine.find('users.online')).map((o) => o.username)) {
      if (global.commons.isBot(username)) continue

      if (parseInt(interval, 10) !== 0 && parseInt(ptsPerInterval, 10) !== 0) {
        let user = await global.db.engine.findOne('users', { username: username })
        _.set(user, 'time.points', _.get(user, 'time.points', 0))
        let shouldUpdate = new Date().getTime() - new Date(user.time.points).getTime() >= interval
        if (shouldUpdate) {
          await global.db.engine.insert('users.points', { username: username, points: parseInt(ptsPerInterval, 10) })
          await global.db.engine.update('users', { username: username }, { time: { points: new Date() } })
        }
      } else {
        // force time update if interval or points are 0
        await global.db.engine.update('users', { username: username }, { time: { points: new Date() } })
      }
    }
  } catch (e) {
    global.log.error(e)
    global.log.error(e.stack)
  } finally {
    new Timeout().recursive({ uid: `updatePoints`, this: this, fnc: this.updatePoints, wait: 5000 })
  }
}

Points.prototype.compactPointsDb = async function () {
  try {
    await global.commons.compactDb({ table: 'users.points', index: 'username', values: 'points' })
  } catch (e) {
    global.log.error(e)
    global.log.error(e.stack)
  } finally {
    new Timeout().recursive({ uid: `compactPointsDb`, this: this, fnc: this.compactPointsDb, wait: 60000 })
  }
}

module.exports = new Points()
