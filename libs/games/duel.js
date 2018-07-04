'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('game:duel')
const cluster = require('cluster')

// bot libraries
const Game = require('./_interface')
const Timeout = require('../timeout')

const ERROR_NOT_ENOUGH_OPTIONS = '0'
const ERROR_ZERO_BET = '1'
const ERROR_NOT_ENOUGH_POINTS = '2'
const ERROR_MINIMAL_BET = '3'

/*
 * !duel [points]   - start or participate in duel
 */

// TODO: duelUsers
class Duel extends Game {
  constructor () {
    const collection = {
      settings: 'games.duel.settings',
      users: 'games.duel.users'
    }
    const settings = {
      timestamp: String(new Date()),
      cooldown: String(new Date()),
      commands: [
        '!duel'
      ]
    }

    super({ collection, settings })

    global.configuration.register('duelCooldown', 'gambling.cooldown.duel', 'number', 0)
    global.configuration.register('duelDuration', 'gambling.duel.duration', 'number', 5)
    global.configuration.register('duelMinimalBet', 'gambling.duel.minimalBet', 'number', 0)

    if (cluster.isMaster) this.pickDuelWinner()
  }

  async pickDuelWinner () {
    const [users, timestamp, duelDuration] = await Promise.all([
      global.db.engine.find(this.collection.users),
      this.settings.timestamp,
      global.configuration.getValue('duelDuration')
    ])

    if (timestamp === 0 || new Date().getTime() - timestamp < 1000 * 60 * duelDuration) {
      new Timeout().recursive({ uid: `gamblingPickDuelWinner`, this: this, fnc: this.pickDuelWinner, wait: 30000 })
      return
    }

    debug('Duel users: %j', users)
    let total = 0
    for (let user of users) total += parseInt(user.ticket, 10)

    let winner = _.random(0, total, false)
    let winnerUsername
    for (let user of users) {
      winner = winner - user.tickets
      if (winner <= 0) { // winner tickets are <= 0 , we have winner
        winnerUsername = user.username
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
    await global.db.engine.remove(this.collection.users, {})
    this.settings.timestamp = 0

    new Timeout().recursive({ uid: `gamblingPickDuelWinner`, this: this, fnc: this.pickDuelWinner, wait: 30000 })
  }

  async main (opts) {
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
      let userFromDB = await global.db.engine.findOne(this.collection.users, { username: opts.sender.username })
      const isNewDuelist = !_.isEmpty(userFromDB)
      if (!isNewDuelist) {
        await global.db.engine.update(this.collection.users, { _id: String(userFromDB._id) }, { tickets: Number(userFromDB.tickets) + Number(bet) })
      } else {
        // check if under gambling cooldown
        const cooldown = await global.configuration.getValue('duelCooldown')
        const isMod = await global.commons.isMod(opts.sender)
        if (new Date().getTime() - new Date(await this.settings.cooldown).getTime() > cooldown * 1000 ||
          (await global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.commons.isBroadcaster(opts.sender)))) {
          // save new cooldown if not bypassed
          if (!(await global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.commons.isBroadcaster(opts.sender)))) this.settings.cooldown = new Date()
          await global.db.engine.insert(this.collection.users, { username: opts.sender.username, tickets: Number(bet) })
        } else {
          message = await global.commons.prepare('gambling.fightme.cooldown', {
            minutesName: global.commons.getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(await this.settings.cooldown).getTime())) / 1000 / 60), 'core.minutes'),
            cooldown: Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(await this.settings.cooldown).getTime())) / 1000 / 60) })
          debug(message); global.commons.sendMessage(message, opts.sender)
          return true
        }
      }

      // if new duel, we want to save timestamp
      if ((await this.settings.timestamp) === 0) {
        this.settings.timestamp = new Date()
        message = await global.commons.prepare('gambling.duel.new', {
          minutesName: global.commons.getLocalizedName(5, 'core.minutes'),
          minutes: await global.configuration.getValue('duelDuration') })
        debug(message); global.commons.sendMessage(message, opts.sender)
      }

      const tickets = (await global.db.engine.findOne(this.collection.settings, { username: opts.sender.username })).tickets
      message = await global.commons.prepare(isNewDuelist ? 'gambling.duel.joined' : 'gambling.duel.added', {
        pointsName: await global.systems.points.getPointsName(tickets),
        points: tickets
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
}

module.exports = new Duel()
