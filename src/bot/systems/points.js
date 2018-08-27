'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:points')

// bot libraries
const constants = require('../constants')
const Timeout = require('../timeout')
const System = require('./_interface')

class Points extends System {
  constructor () {
    const settings = {
      points: {
        name: 'point|points', // default is <singular>|<plural> | in some languages can be set with custom <singular>|<x:multi>|<plural> where x <= 10
        interval: 10,
        perInterval: 1,
        offlineInterval: 30,
        perOfflineInterval: 1,
        messageInterval: 5,
        perMessageInterval: 1,
        messageOfflineInterval: 5,
        perMessageOfflineInterval: 0
      },
      parsers: [
        { name: 'messagePoints', fireAndForget: true }
      ],
      commands: [
        {name: '!points add', permission: constants.OWNER_ONLY},
        {name: '!points remove', permission: constants.OWNER_ONLY},
        {name: '!points all', permission: constants.OWNER_ONLY},
        {name: '!points set', permission: constants.OWNER_ONLY},
        {name: '!points get', permission: constants.OWNER_ONLY},
        {name: '!makeitrain', fnc: 'rain', permission: constants.OWNER_ONLY},
        '!points give',
        '!points'
      ]
    }
    super({settings})

    if (require('cluster').isMaster) {
      this.updatePoints()
      this.compactPointsDb()
    }
  }

  async updatePoints () {
    try {
      if (!(await this.isEnabled())) return new Timeout().recursive({ uid: 'updatePoints', this: this, fnc: this.updatePoints, wait: 5000 })

      let [interval, perInterval, offlineInterval, perOfflineInterval, isOnline] = await Promise.all([
        this.settings.points.interval,
        this.settings.points.perInterval,
        this.settings.points.offlineInterval,
        this.settings.points.perOfflineInterval,
        global.cache.isOnline()
      ])

      interval = isOnline ? interval * 60 * 1000 : offlineInterval * 60 * 1000
      var ptsPerInterval = isOnline ? perInterval : perOfflineInterval

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
      new Timeout().recursive({ uid: 'updatePoints', this: this, fnc: this.updatePoints, wait: 5000 })
    }
  }

  async compactPointsDb () {
    try {
      await global.commons.compactDb({ table: 'users.points', index: 'username', values: 'points' })
    } catch (e) {
      global.log.error(e)
      global.log.error(e.stack)
    } finally {
      new Timeout().recursive({ uid: 'compactPointsDb', this: this, fnc: this.compactPointsDb, wait: 60000 })
    }
  }

  async messagePoints (opts) {
    if (opts.skip || opts.message.startsWith('!')) return true

    let [perMessageInterval, messageInterval, perMessageOfflineInterval, messageOfflineInterval, isOnline] = await Promise.all([
      this.settings.points.perMessageInterval,
      this.settings.points.messageInterval,
      this.settings.points.perMessageOfflineInterval,
      this.settings.points.messageOfflineInterval,
      global.cache.isOnline()
    ])

    const interval = isOnline ? messageInterval : messageOfflineInterval
    const ptsPerInterval = isOnline ? perMessageInterval : perMessageOfflineInterval

    if (interval === 0 || ptsPerInterval === 0) return

    let [user, userMessages] = await Promise.all([
      global.users.get(opts.sender.username),
      global.users.getMessagesOf(opts.sender.username)
    ])
    let lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints

    if (lastMessageCount + interval <= userMessages) {
      await global.db.engine.insert('users.points', { username: user.username, points: parseInt(ptsPerInterval, 10) })
      await global.db.engine.update('users', { username: user.username }, { custom: { lastMessagePoints: userMessages } })
    }
    return true
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('reset', async () => {
        global.db.engine.remove('users.points', {})
      })
    })
  }

  async getPointsOf (user) {
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

  async set (opts) {
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

  async give (opts) {
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

  async getPointsName (points) {
    var pointsNames = (await this.settings.points.name).split('|').map(Function.prototype.call, String.prototype.trim)
    var single, multi, xmulti
    // get single|x:multi|multi from pointsName
    if ((await this.settings.points.name).length === 0) {
      return ''
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

  async get (opts) {
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
      global.commons.sendMessage(global.translate('points.failed.get'), opts.sender)
    }
  }

  async all (opts) {
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

  async rain (opts) {
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

  async add (opts) {
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

  async remove (opts) {
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

  main (opts) {
    this.get(opts)
  }
}

module.exports = new Points()
