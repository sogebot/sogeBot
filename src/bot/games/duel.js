'use strict'

// 3rdparty libraries
const _ = require('lodash')
const cluster = require('cluster')

// bot libraries
const Game = require('./_interface')

const ERROR_NOT_ENOUGH_OPTIONS = '0'
const ERROR_ZERO_BET = '1'
const ERROR_NOT_ENOUGH_POINTS = '2'
const ERROR_MINIMAL_BET = '3'

/*
 * !duel [points]   - start or participate in duel
 */

class Duel extends Game {
  constructor () {
    const settings = {
      _: {
        timestamp: 0,
        cooldown: String(new Date())
      },
      cooldown: 0,
      duration: 5,
      minimalBet: 0,
      bypassCooldownByOwnerAndMods: false,
      commands: [
        '!duel'
      ]
    }

    super({ settings })

    if (cluster.isMaster) this.pickDuelWinner()
  }

  async pickDuelWinner () {
    clearTimeout(this.timeouts['pickDuelWinner'])

    const [users, timestamp, duelDuration] = await Promise.all([
      global.db.engine.find(this.collection.users),
      this.settings._.timestamp,
      this.settings.duration
    ])

    if (timestamp === 0 || new Date().getTime() - timestamp < 1000 * 60 * duelDuration) {
      this.timeouts['pickDuelWinner'] = setTimeout(() => this.pickDuelWinner(), 30000)
      return
    }

    let total = 0
    for (let user of users) total += parseInt(user.tickets, 10)

    let winner = _.random(0, total, false)
    let winnerUser
    for (let user of users) {
      winner = winner - user.tickets
      if (winner <= 0) { // winner tickets are <= 0 , we have winner
        winnerUser = user
        break
      }
    }

    const probability = winnerUser.tickets / (total / 100)

    let m = await global.commons.prepare(_.size(users) === 1 ? 'gambling.duel.noContestant' : 'gambling.duel.winner', {
      pointsName: await global.systems.points.getPointsName(total),
      points: total,
      probability: _.round(probability, 2),
      ticketsName: await global.systems.points.getPointsName(winnerUser.tickets),
      tickets: winnerUser.tickets,
      winner: winnerUser.username
    })
    global.commons.sendMessage(m, { username: global.commons.getOwner() }, { force: true })

    // give user his points
    await global.db.engine.insert('users.points', { id: winnerUser.id, points: parseInt(total, 10) })

    // reset duel
    await global.db.engine.remove(this.collection.users, {})
    this.settings._.timestamp = 0

    this.timeouts['pickDuelWinner'] = setTimeout(() => this.pickDuelWinner(), 30000)
  }

  async main (opts) {
    let message, bet

    opts.sender['message-type'] = 'chat' // force responses to chat
    try {
      let parsed = opts.parameters.trim().match(/^([\d]+|all)$/)
      if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

      const points = await global.systems.points.getPointsOf(opts.sender.userId)
      bet = parsed[1] === 'all' ? points : parsed[1]

      if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)
      if (points < bet) throw Error(ERROR_NOT_ENOUGH_POINTS)
      if (bet < (await this.settings.minimalBet)) throw Error(ERROR_MINIMAL_BET)

      await global.db.engine.insert('users.points', { id: opts.sender.userId, points: parseInt(bet, 10) * -1 })

      // check if user is already in duel and add points
      let userFromDB = await global.db.engine.findOne(this.collection.users, { id: opts.sender.userId })
      const isNewDuelist = _.isEmpty(userFromDB)
      if (!isNewDuelist) {
        await global.db.engine.update(this.collection.users, { _id: String(userFromDB._id) }, { tickets: Number(userFromDB.tickets) + Number(bet) })
      } else {
        // check if under gambling cooldown
        const cooldown = await this.settings.cooldown
        const isMod = await global.commons.isMod(opts.sender)
        if (new Date().getTime() - new Date(await this.settings._.cooldown).getTime() > cooldown * 1000 ||
          (await this.settings.bypassCooldownByOwnerAndMods && (isMod || global.commons.isBroadcaster(opts.sender)))) {
          // save new cooldown if not bypassed
          if (!(await this.settings.bypassCooldownByOwnerAndMods && (isMod || global.commons.isBroadcaster(opts.sender)))) this.settings._.cooldown = new Date()
          await global.db.engine.insert(this.collection.users, { id: opts.sender.userId, username: opts.sender.username, tickets: Number(bet) })
        } else {
          message = await global.commons.prepare('gambling.fightme.cooldown', {
            minutesName: global.commons.getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(await this.settings._.cooldown).getTime())) / 1000 / 60), 'core.minutes'),
            cooldown: Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(await this.settings._.cooldown).getTime())) / 1000 / 60),
            command: opts.command })
          global.commons.sendMessage(message, opts.sender)
          return true
        }
      }

      // if new duel, we want to save timestamp
      if ((await this.settings._.timestamp) === 0) {
        this.settings._.timestamp = new Date()
        message = await global.commons.prepare('gambling.duel.new', {
          minutesName: global.commons.getLocalizedName(5, 'core.minutes'),
          minutes: await this.settings.duration,
          command: opts.command })
        global.commons.sendMessage(message, opts.sender)
      }

      const tickets = (await global.db.engine.findOne(this.collection.users, { id: opts.sender.userId })).tickets
      message = await global.commons.prepare(isNewDuelist ? 'gambling.duel.joined' : 'gambling.duel.added', {
        pointsName: await global.systems.points.getPointsName(tickets),
        points: tickets
      })
      global.commons.sendMessage(message, opts.sender)
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('gambling.duel.notEnoughOptions'), opts.sender)
          break
        case ERROR_ZERO_BET:
          message = await global.commons.prepare('gambling.duel.zeroBet', {
            pointsName: await global.systems.points.getPointsName(0)
          })
          global.commons.sendMessage(message, opts.sender)
          break
        case ERROR_NOT_ENOUGH_POINTS:
          message = await global.commons.prepare('gambling.duel.notEnoughPoints', {
            pointsName: await global.systems.points.getPointsName(bet),
            points: bet
          })
          global.commons.sendMessage(message, opts.sender)
          break
        case ERROR_MINIMAL_BET:
          bet = await this.settings.minimalBet
          message = await global.commons.prepare('gambling.duel.lowerThanMinimalBet', {
            pointsName: await global.systems.points.getPointsName(bet),
            points: bet,
            command: opts.command
          })
          global.commons.sendMessage(message, opts.sender)
          break
        default:
          global.log.error(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
    }
  }
}

module.exports = new Duel()
