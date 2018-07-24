'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
const constants = require('../constants')
const debug = require('debug')('systems:gambling')
const Timeout = require('../timeout')

const ERROR_NOT_ENOUGH_OPTIONS = '0'
const ERROR_ZERO_BET = '1'
const ERROR_NOT_ENOUGH_POINTS = '2'
const ERROR_MINIMAL_BET = '3'

/*
 * !gamble [amount] - gamble [amount] points with `chanceToWin` chance
 * !seppuku         - timeout yourself
 * !roulette        - 50/50 chance to timeout yourself
 * !duel [points]   - start or participate in duel
 */

class Gambling {
  constructor () {
    this.collection = 'gambling'
    this.timeouts = {}

    global.configuration.register('seppukuTimeout', 'gambling.seppuku.timeout', 'number', 10)
    global.configuration.register('rouletteTimeout', 'gambling.roulette.timeout', 'number', 10)
    global.configuration.register('fightmeTimeout', 'gambling.fightme.timeout', 'number', 10)

    global.configuration.register('gamblingCooldownBypass', 'gambling.cooldown.bypass', 'bool', false)
    global.configuration.register('duelCooldown', 'gambling.cooldown.duel', 'number', 0)
    global.configuration.register('fightmeCooldown', 'gambling.cooldown.fightme', 'number', 0)

    global.configuration.register('gamblingChanceToWin', 'gambling.gamble.chanceToWin', 'number', 50)
    global.configuration.register('gamblingMinimalBet', 'gambling.gamble.minimalBet', 'number', 0)

    global.configuration.register('duelDuration', 'gambling.duel.duration', 'number', 5)
    global.configuration.register('duelMinimalBet', 'gambling.duel.minimalBet', 'number', 0)

    if (require('cluster').isMaster) this.pickDuelWinner()
  }

  commands () {
    const isGamblingEnabled = global.commons.isSystemEnabled('gambling')
    const isPointsEnabled = global.commons.isSystemEnabled('points')
    let commands = []

    if (isGamblingEnabled) {
      commands.push(
        {this: this, id: '!seppuku', command: '!seppuku', fnc: this.seppuku, permission: constants.VIEWERS},
        {this: this, id: '!roulette', command: '!roulette', fnc: this.roulette, permission: constants.VIEWERS},
        {this: this, id: '!fightme', command: '!fightme', fnc: this.fightme, permission: constants.VIEWERS}
      )

      if (isPointsEnabled) {
        commands.push(
          {this: this, id: '!gamble', command: '!gamble', fnc: this.gamble, permission: constants.VIEWERS},
          {this: this, id: '!duel', command: '!duel', fnc: this.duel, permission: constants.VIEWERS}
        )
      }
    }
    return commands
  }

  get duelTimestamp () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.duel`, { key: '_timestamp' }), 'value', 0)))
  }
  set duelTimestamp (v) {
    if (v === 0) global.db.engine.remove(`${this.collection}.duel`, { key: '_timestamp' })
    else global.db.engine.update(`${this.collection}.duel`, { key: '_timestamp' }, { value: v })
  }

  get duelCooldown () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.duel`, { key: '_cooldown' }), 'value', 0)))
  }
  set duelCooldown (v) {
    if (v === 0) global.db.engine.remove(`${this.collection}.duel`, { key: '_cooldown' })
    else global.db.engine.update(`${this.collection}.duel`, { key: '_cooldown' }, { value: v })
  }

  get fightmeCooldown () {
    return new Promise(async (resolve, reject) => resolve(_.get(await global.db.engine.findOne(`${this.collection}.fightme`, { key: '_cooldown' }), 'value', 0)))
  }
  set fightmeCooldown (v) {
    if (v === 0) global.db.engine.remove(`${this.collection}.fightme`, { key: '_cooldown' })
    else global.db.engine.update(`${this.collection}.fightme`, { key: '_cooldown' }, { value: v })
  }

  get duelUsers () {
    return new Promise(async (resolve, reject) => {
      let users = await global.db.engine.find(`${this.collection}.duel`, { key: '_users' })
      let toResolve = {}
      for (let user of users) {
        toResolve[user.user] = user.tickets
      }
      resolve(toResolve)
    })
  }
  set duelUsers (v) {
    if (_.isNil(v)) global.db.engine.remove(`${this.collection}.duel`, { key: '_users' })
    else {
      for (let [user, tickets] of Object.entries(v)) global.db.engine.update(`${this.collection}.duel`, { key: '_users', user: user }, { tickets: tickets })
    }
  }

  async pickDuelWinner () {
    const [users, timestamp, duelDuration] = await Promise.all([
      this.duelUsers,
      this.duelTimestamp,
      global.configuration.getValue('duelDuration')
    ])

    if (timestamp === 0 || new Date().getTime() - timestamp < 1000 * 60 * duelDuration) {
      new Timeout().recursive({ uid: `gamblingPickDuelWinner`, this: this, fnc: this.pickDuelWinner, wait: 30000 })
      return
    }

    debug('Duel users: %j', users)
    let total = 0
    for (let user of Object.entries(users)) total += parseInt(user[1], 10)

    let winner = _.random(0, total, false)
    let winnerUsername
    for (let [user, tickets] of Object.entries(users)) {
      winner = winner - tickets
      if (winner <= 0) { // winner tickets are <= 0 , we have winner
        winnerUsername = user
        break
      }
    }

    const username = winnerUsername
    const tickets = users[username]
    const probability = tickets / (total / 100)

    let m = await global.commons.prepare(_.size(users) === 1 ? 'gambling.duel.noContestant' : 'gambling.duel.winner', {
      pointsName: await global.systems.points.getPointsName(total),
      points: total,
      probability: _.round(probability, 2),
      ticketsName: await global.systems.points.getPointsName(tickets),
      tickets: tickets,
      winner: username
    })
    debug(m); global.commons.sendMessage(m, { username: global.commons.getOwner() }, { force: true })

    // give user his points
    await global.db.engine.insert('users.points', { username: username, points: parseInt(total, 10) })

    // reset duel
    this.duelUsers = null
    this.duelTimestamp = 0

    new Timeout().recursive({ uid: `gamblingPickDuelWinner`, this: this, fnc: this.pickDuelWinner, wait: 30000 })
  }

  async duel (opts) {
    let message, bet

    opts.sender['message-type'] = 'chat' // force responses to chat
    try {
      let parsed = opts.parameters.trim().match(/^([\d]+|all)$/)
      if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

      const user = await global.users.get(opts.sender.username)
      const points = await global.systems.points.getPointsOf(user.username)
      bet = parsed[1] === 'all' ? points : parsed[1]

      if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)
      if (points < bet) throw Error(ERROR_NOT_ENOUGH_POINTS)
      if (bet < (await global.configuration.getValue('duelMinimalBet'))) throw Error(ERROR_MINIMAL_BET)

      await global.db.engine.insert('users.points', { username: opts.sender.username, points: parseInt(bet, 10) * -1 })

      // check if user is already in duel and add points
      let newDuelist = true
      let users = await this.duelUsers
      _.each(users, function (value, key) {
        if (key.toLowerCase() === opts.sender.username.toLowerCase()) {
          let userToUpdate = {}
          userToUpdate[key] = parseInt(users[key], 10) + parseInt(bet, 10)
          this.duelUsers = userToUpdate
          newDuelist = false
          return false
        }
      })
      if (newDuelist) {
        // check if under gambling cooldown
        const cooldown = await global.configuration.getValue('duelCooldown')
        const isMod = await global.commons.isMod(opts.sender)
        if (new Date().getTime() - (await this.duelCooldown) > cooldown * 1000 ||
          (await global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.commons.isBroadcaster(opts.sender)))) {
          // save new cooldown if not bypassed
          if (!(await global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.commons.isBroadcaster(opts.sender)))) this.duelCooldown = new Date().getTime()
          let newUser = {}
          newUser[opts.sender.username.toLowerCase()] = parseInt(bet, 10)
          this.duelUsers = newUser
        } else {
          message = await global.commons.prepare('gambling.fightme.cooldown', {
            minutesName: global.commons.getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - (await this.duelCooldown))) / 1000 / 60), 'core.minutes'),
            cooldown: Math.round(((cooldown * 1000) - (new Date().getTime() - (await this.duelCooldown))) / 1000 / 60) })
          debug(message); global.commons.sendMessage(message, opts.sender)
          return true
        }
      }

      // if new duel, we want to save timestamp
      if ((await this.duelTimestamp) === 0) {
        this.duelTimestamp = new Date().getTime()
        message = await global.commons.prepare('gambling.duel.new', {
          minutesName: global.commons.getLocalizedName(5, 'core.minutes'),
          minutes: await global.configuration.getValue('duelDuration') })
        debug(message); global.commons.sendMessage(message, opts.sender)
      }

      message = await global.commons.prepare(newDuelist ? 'gambling.duel.joined' : 'gambling.duel.added', {
        pointsName: await global.systems.points.getPointsName((await this.duelUsers)[opts.sender.username.toLowerCase()]),
        points: (await this.duelUsers)[opts.sender.username.toLowerCase()]
      })
      debug(message); global.commons.sendMessage(message, opts.sender)
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('gambling.duel.notEnoughOptions'), opts.sender)
          break
        case ERROR_ZERO_BET:
          message = await global.commons.prepare('gambling.duel.zeroBet', {
            pointsName: await global.systems.points.getPointsName(0)
          })
          debug(message); global.commons.sendMessage(message, opts.sender)
          break
        case ERROR_NOT_ENOUGH_POINTS:
          message = await global.commons.prepare('gambling.duel.notEnoughPoints', {
            pointsName: await global.systems.points.getPointsName(bet),
            points: bet
          })
          debug(message); global.commons.sendMessage(message, opts.sender)
          break
        case ERROR_MINIMAL_BET:
          bet = await global.configuration.getValue('duelMinimalBet')
          message = await global.commons.prepare('gambling.duel.lowerThanMinimalBet', {
            pointsName: await global.systems.points.getPointsName(bet),
            points: bet
          })
          debug(message); global.commons.sendMessage(message, opts.sender)
          break
        default:
          global.log.error(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
    }
  }

  async roulette (opts) {
    opts.sender['message-type'] = 'chat' // force responses to chat

    let isAlive = _.random(0, 1, false)
    const isMod = await global.commons.isMod(opts.sender)

    global.commons.sendMessage(global.translate('gambling.roulette.trigger'), opts.sender)
    if (global.commons.isBroadcaster(opts.sender)) {
      setTimeout(() => global.commons.sendMessage(global.translate('gambling.roulette.broadcaster'), opts.sender), 2000)
      return
    }

    if (isMod) {
      setTimeout(() => global.commons.sendMessage(global.translate('gambling.roulette.mod'), opts.sender), 2000)
      return
    }

    setTimeout(async () => {
      if (!isAlive) global.commons.timeout(opts.sender.username, null, await global.configuration.getValue('rouletteTimeout'))
      global.commons.sendMessage(isAlive ? global.translate('gambling.roulette.alive') : global.translate('gambling.roulette.dead'), opts.sender)
    }, 2000)
  }

  async seppuku (opts) {
    if (global.commons.isBroadcaster(opts.sender)) {
      global.commons.sendMessage(global.translate('gambling.seppuku.broadcaster'), opts.sender)
      return
    }

    const isMod = await global.commons.isMod(opts.sender)
    if (isMod) {
      global.commons.sendMessage(global.translate('gambling.seppuku.mod'), opts.sender)
      return
    }

    global.commons.sendMessage(global.translate('gambling.seppuku.text'), opts.sender)
    global.commons.timeout(opts.sender.username, null, await global.configuration.getValue('seppukuTimeout'))
  }

  async fightme (opts) {
    opts.sender['message-type'] = 'chat' // force responses to chat
    var username

    try {
      username = opts.parameters.trim().match(/^@?([\S]+)$/)[1].toLowerCase()
      opts.sender.username = opts.sender.username.toLowerCase()
    } catch (e) {
      global.commons.sendMessage(global.translate('gambling.fightme.notEnoughOptions'), opts.sender)
      return
    }

    if (opts.sender.username === username) {
      global.commons.sendMessage(global.translate('gambling.fightme.cannotFightWithYourself'), opts.sender)
      return
    }

    // check if you are challenged by user
    const challenge = await global.db.engine.findOne(`${this.collection}.fightme`, { key: '_users', user: username, challenging: opts.sender.username })
    const isChallenged = !_.isEmpty(challenge)
    if (isChallenged) {
      let winner = _.random(0, 1, false)
      let isMod = {
        user: await global.commons.isMod(username),
        sender: await global.commons.isMod(opts.sender)
      }

      // vs broadcaster
      if (global.commons.isBroadcaster(opts.sender) || global.commons.isBroadcaster(username)) {
        debug('vs broadcaster')
        global.commons.sendMessage(global.translate('gambling.fightme.broadcaster')
          .replace(/\$winner/g, global.commons.isBroadcaster(opts.sender) ? opts.sender.username : username), opts.sender)
        isMod = global.commons.isBroadcaster(opts.sender) ? isMod.user : isMod.opts.sender
        if (!isMod) global.commons.timeout(global.commons.isBroadcaster(opts.sender) ? username : opts.sender.username, null, await global.configuration.getValue('fightmeTimeout'))
        global.db.engine.remove(`${this.collection}.fightme`, { _id: challenge._id.toString() })
        return
      }

      // mod vs mod
      if (isMod.user && isMod.opts.sender) {
        debug('mod vs mod')
        global.commons.sendMessage(global.translate('gambling.fightme.bothModerators')
          .replace(/\$challenger/g, username), opts.sender)
        global.db.engine.remove(`${this.collection}.fightme`, { _id: challenge._id.toString() })
        return
      }

      // vs mod
      if (isMod.user || isMod.opts.sender) {
        debug('vs mod')
        global.commons.sendMessage(global.translate('gambling.fightme.oneModerator')
          .replace(/\$winner/g, isMod.opts.sender ? opts.sender.username : username), opts.sender)
        global.commons.timeout(isMod.opts.sender ? username : opts.sender.username, null, await global.configuration.getValue('fightmeTimeout'))
        global.db.engine.remove(`${this.collection}.fightme`, { _id: challenge._id.toString() })
        return
      }

      debug('user vs user')
      global.commons.timeout(winner ? opts.sender.username : username, null, await global.configuration.getValue('fightmeTimeout'))
      global.commons.sendMessage(global.translate('gambling.fightme.winner')
        .replace(/\$winner/g, winner ? username : opts.sender.username), opts.sender)
      global.db.engine.remove(`${this.collection}.fightme`, { _id: challenge._id.toString() })
    } else {
      // check if under gambling cooldown
      const cooldown = await global.configuration.getValue('fightmeCooldown')
      const isMod = await global.commons.isMod(opts.sender)
      if (new Date().getTime() - (await this.fightmeCooldown) < cooldown * 1000 &&
        !(await global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.commons.isBroadcaster(opts.sender)))) {
        global.commons.sendMessage(global.translate('gambling.fightme.cooldown')
          .replace(/\$cooldown/g, Math.round(((cooldown * 1000) - (new Date().getTime() - (await this.fightmeCooldown))) / 1000 / 60))
          .replace(/\$minutesName/g, global.commons.getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - (await this.fightmeCooldown))) / 1000 / 60), 'core.minutes')), opts.sender)
        return
      }

      // save new timestamp if not bypassed
      if (!(await global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.commons.isBroadcaster(opts.sender)))) this.fightmeCooldown = new Date().getTime()

      const isAlreadyChallenged = !_.isEmpty(await global.db.engine.findOne(`${this.collection}.fightme`, { key: '_users', user: opts.sender.username, challenging: username }))
      if (!isAlreadyChallenged) await global.db.engine.insert(`${this.collection}.fightme`, { key: '_users', user: opts.sender.username, challenging: username })
      global.commons.sendMessage(await global.commons.prepare('gambling.fightme.challenge', { username: username }), opts.sender)
    }
  }

  async gamble (opts) {
    let points, message

    opts.sender['message-type'] = 'chat' // force responses to chat
    try {
      let parsed = opts.parameters.trim().match(/^([\d]+|all)$/)
      if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

      const user = await global.users.get(opts.sender.username)
      const pointsOfUser = await global.systems.points.getPointsOf(user.username)
      points = parsed[1] === 'all' ? pointsOfUser : parsed[1]

      if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)
      if (pointsOfUser < points) throw Error(ERROR_NOT_ENOUGH_POINTS)
      if (points < (await global.configuration.getValue('gamblingMinimalBet'))) throw Error(ERROR_MINIMAL_BET)

      await global.db.engine.insert('users.points', { username: opts.sender.username, points: parseInt(points, 10) * -1 })
      if (_.random(0, 100, false) <= await global.configuration.getValue('gamblingChanceToWin')) {
        await global.db.engine.insert('users.points', { username: opts.sender.username, points: parseInt(points, 10) * 2 })
        let updatedPoints = await global.systems.points.getPointsOf(opts.sender.username)
        message = await global.commons.prepare('gambling.gamble.win', {
          pointsName: await global.systems.points.getPointsName(updatedPoints),
          points: updatedPoints
        })
        debug(message); global.commons.sendMessage(message, opts.sender)
      } else {
        message = await global.commons.prepare('gambling.gamble.lose', {
          pointsName: await global.systems.points.getPointsName(await global.systems.points.getPointsOf(user.username)),
          points: await global.systems.points.getPointsOf(user.username)
        })
        debug(message); global.commons.sendMessage(message, opts.sender)
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          message = await global.commons.prepare('gambling.gamble.zeroBet', {
            pointsName: await global.systems.points.getPointsName(0)
          })
          debug(message); global.commons.sendMessage(message, opts.sender)
          break
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('gambling.gamble.notEnoughOptions'), opts.sender)
          break
        case ERROR_NOT_ENOUGH_POINTS:
          message = await global.commons.prepare('gambling.gamble.notEnoughPoints', {
            pointsName: await global.systems.points.getPointsName(points),
            points: points
          })
          debug(message); global.commons.sendMessage(message, opts.sender)
          break
        case ERROR_MINIMAL_BET:
          points = await global.configuration.getValue('gamblingMinimalBet')
          message = await global.commons.prepare('gambling.gamble.lowerThanMinimalBet', {
            pointsName: await global.systems.points.getPointsName(points),
            points: points
          })
          debug(message); global.commons.sendMessage(message, opts.sender)
          break
        default:
          global.log.error(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
    }
  }
}

module.exports = new Gambling()
