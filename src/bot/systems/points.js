'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
const constants = require('../constants')
const System = require('./_interface')
const Expects = require('../expects')

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
        { name: '!points add', permission: constants.OWNER_ONLY },
        { name: '!points remove', permission: constants.OWNER_ONLY },
        { name: '!points all', permission: constants.OWNER_ONLY },
        { name: '!points set', permission: constants.OWNER_ONLY },
        { name: '!points get', permission: constants.OWNER_ONLY },
        { name: '!makeitrain', fnc: 'rain', permission: constants.OWNER_ONLY },
        '!points give',
        '!points'
      ]
    }
    super({ settings })

    if (require('cluster').isMaster) {
      this.updatePoints()
      this.compactPointsDb()
    }
  }

  async updatePoints () {
    clearTimeout(this.timeouts['updatePoints'])
    if (!(await this.isEnabled())) {
      this.timeouts['updatePoints'] = setTimeout(() => this.updatePoints(), 5000)
      return
    }

    let [interval, perInterval, offlineInterval, perOfflineInterval, isOnline] = await Promise.all([
      this.settings.points.interval,
      this.settings.points.perInterval,
      this.settings.points.offlineInterval,
      this.settings.points.perOfflineInterval,
      global.cache.isOnline()
    ])

    interval = isOnline ? interval * 60 * 1000 : offlineInterval * 60 * 1000
    var ptsPerInterval = isOnline ? perInterval : perOfflineInterval

    try {
      for (let username of (await global.db.engine.find('users.online')).map((o) => o.username)) {
        if (await global.commons.isBot(username)) continue

        let user = await global.db.engine.findOne('users', { username })
        if (_.isEmpty(user)) user.id = await global.users.getIdFromTwitch(username)
        if (user.id) {
          if (parseInt(interval, 10) !== 0 && parseInt(ptsPerInterval, 10) !== 0) {
            _.set(user, 'time.points', _.get(user, 'time.points', 0))
            let shouldUpdate = new Date().getTime() - new Date(user.time.points).getTime() >= interval
            if (shouldUpdate) {
              await global.db.engine.insert('users.points', { id: user.id, points: parseInt(ptsPerInterval, 10) })
              await global.db.engine.update('users', { id: user.id }, { id: user.id, username, time: { points: String(new Date()) } })
            }
          } else {
            // force time update if interval or points are 0
            await global.db.engine.update('users', { id: user.id }, { id: user.id, username, time: { points: String(new Date()) } })
          }
        }
      }
    } catch (e) {
      global.log.error(e)
      global.log.error(e.stack)
    } finally {
      this.timeouts['updatePoints'] = setTimeout(() => this.updatePoints(), interval === 0 ? 60000 : interval)
    }
  }

  async compactPointsDb () {
    clearTimeout(this.timeouts['compactPointsDb'])
    try {
      await global.commons.compactDb({ table: 'users.points', index: 'id', values: 'points' })
    } catch (e) {
      global.log.error(e)
      global.log.error(e.stack)
    } finally {
      this.timeouts['compactPointsDb'] = setTimeout(() => this.compactPointsDb(), 10000)
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
      global.users.getById(opts.sender.userId),
      global.users.getMessagesOf(opts.sender.userId)
    ])
    let lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints

    if (lastMessageCount + interval <= userMessages) {
      await global.db.engine.insert('users.points', { id: opts.sender.userId, points: parseInt(ptsPerInterval, 10) })
      await global.db.engine.update('users', { id: opts.sender.userId }, { custom: { lastMessagePoints: userMessages } })
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

  async getPointsOf (id) {
    let points = 0
    for (let item of await global.db.engine.find('users.points', { id })) {
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
      const [username, points] = new Expects(opts.parameters).username().points({ all: false })

      const user = global.users.getByName(username)
      if (user.id) {
        await global.db.engine.remove('users.points', { id: user.id })
        await global.db.engine.insert('users.points', { id: user.id, points })

        let message = await global.commons.prepare('points.success.set', {
          amount: points,
          username,
          pointsName: await this.getPointsName(points)
        })
        global.commons.sendMessage(message, opts.sender)
      } else {
        throw new Error('User doesn\'t have ID')
      }
    } catch (err) {
      global.commons.sendMessage(global.translate('points.failed.set').replace('$command', opts.command), opts.sender)
    }
  }

  async give (opts) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true })
      if (opts.sender.username.toLowerCase() === username.toLowerCase()) return

      const availablePoints = await this.getPointsOf(opts.sender.userId)
      const guser = await this.getByName(username)

      if (!guser.id) throw new Error('User doesn\'t have ID')

      if (points !== 'all' && availablePoints < points) {
        let message = await global.commons.prepare('points.failed.giveNotEnough'.replace('$command', opts.command), {
          amount: points,
          username,
          pointsName: await this.getPointsName(points)
        })
        global.commons.sendMessage(message, opts.sender)
      } else if (points === 'all') {
        await global.db.engine.insert('users.points', { id: opts.sender.userId, points: (parseInt(availablePoints, 10) * -1) })
        await global.db.engine.insert('users.points', { id: guser.id, points: parseInt(availablePoints, 10) })
        let message = await global.commons.prepare('points.success.give', {
          amount: availablePoints,
          username,
          pointsName: await this.getPointsName(availablePoints)
        })
        global.commons.sendMessage(message, opts.sender)
      } else {
        await global.db.engine.insert('users.points', { id: opts.sender.userId, points: (parseInt(points, 10) * -1) })
        await global.db.engine.insert('users.points', { id: guser.id, points: parseInt(points, 10) })
        let message = await global.commons.prepare('points.success.give', {
          amount: points,
          username,
          pointsName: await this.getPointsName(points)
        })
        global.commons.sendMessage(message, opts.sender)
      }
    } catch (err) {
      global.commons.sendMessage(global.translate('points.failed.give').replace('$command', opts.command), opts.sender)
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
      const user = await global.users.getByName(username)

      if (!user.id) throw new Error('User doesn\'t have ID')

      let points = await this.getPointsOf(user.id)
      let message = await global.commons.prepare('points.defaults.pointsResponse', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points)
      })
      global.commons.sendMessage(message, opts.sender)
    } catch (err) {
      global.commons.sendMessage(global.translate('points.failed.get').replace('$command', opts.command), opts.sender)
    }
  }

  async all (opts) {
    try {
      const points = new Expects(opts.parameters).points({ all: false })

      for (let username of (await global.db.engine.find('users.online')).map((o) => o.username)) {
        if (await global.commons.isBot(username)) continue

        let user = await global.db.engine.findOne('users', { username })

        if (user.id) {
          await global.db.engine.insert('users.points', { id: user.id, points })
        }
      }
      let message = await global.commons.prepare('points.success.all', {
        amount: points,
        pointsName: await this.getPointsName(points)
      })
      global.commons.sendMessage(message, opts.sender)
    } catch (err) {
      global.commons.sendMessage(global.translate('points.failed.all').replace('$command', opts.command), opts.sender)
    }
  }

  async rain (opts) {
    try {
      const points = new Expects(opts.parameters).points({ all: false })

      for (let username of (await global.db.engine.find('users.online')).map((o) => o.username)) {
        if (await global.commons.isBot(username)) continue

        let user = await global.db.engine.findOne('users', { username })

        if (user.id) {
          await global.db.engine.insert('users.points', { id: user.id, points: parseInt(Math.floor(Math.random() * points), 10) })
        }
      }
      let message = await global.commons.prepare('points.success.rain', {
        amount: points,
        pointsName: await this.getPointsName(points)
      })
      global.commons.sendMessage(message, opts.sender)
    } catch (err) {
      global.commons.sendMessage(global.translate('points.failed.rain').replace('$command', opts.command), opts.sender)
    }
  }

  async add (opts) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: false })
      let user = await global.db.engine.findOne('users', { username })
      if (user.id) {
        await global.db.engine.insert('users.points', { id: user.id, points: points })
      } else {
        throw new Error('User doesn\'t have ID')
      }

      let message = await global.commons.prepare('points.success.add', {
        amount: points,
        username: username,
        pointsName: await this.getPointsName(points)
      })
      global.commons.sendMessage(message, opts.sender)
    } catch (err) {
      global.commons.sendMessage(global.translate('points.failed.add').replace('$command', opts.command), opts.sender)
    }
  }

  async remove (opts) {
    try {
      const [username, points] = new Expects(opts.parameters).username().points({ all: true })
      let user = await global.db.engine.findOne('users', { username })
      if (user.id) {
        if (points === 'all') {
          await global.db.engine.remove('users.points', { id: user.id })
        } else {
          let availablePoints = await this.getPointsOf(user.id)
          await global.db.engine.insert('users.points', { id: user.id, points: -Math.min(points, availablePoints) })
        }

        let message = await global.commons.prepare('points.success.remove', {
          amount: points,
          username: username,
          pointsName: await this.getPointsName(points === 'all' ? 0 : points)
        })
        global.commons.sendMessage(message, opts.sender)
      } else {
        throw new Error('User doesn\'t have ID')
      }
    } catch (err) {
      global.commons.sendMessage(global.translate('points.failed.remove').replace('$command', opts.command), opts.sender)
    }
  }

  main (opts) {
    this.get(opts)
  }
}

module.exports = new Points()
