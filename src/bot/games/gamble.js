'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('game:gamble')

// bot libraries
const Game = require('./_interface')

const ERROR_NOT_ENOUGH_OPTIONS = '0'
const ERROR_ZERO_BET = '1'
const ERROR_NOT_ENOUGH_POINTS = '2'
const ERROR_MINIMAL_BET = '3'

/*
 * !gamble [amount] - gamble [amount] points with `chanceToWin` chance
 */

class Gamble extends Game {
  constructor () {
    const dependsOn = [
      'systems.points'
    ]
    const settings = {
      minimalBet: 0,
      chanceToWin: 50,
      commands: [
        '!gamble'
      ]
    }
    super({ settings, dependsOn })
  }

  async main (opts) {
    let points, message

    opts.sender['message-type'] = 'chat' // force responses to chat
    try {
      let parsed = opts.parameters.trim().match(/^([\d]+|all)$/)
      if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

      const pointsOfUser = await global.systems.points.getPointsOf(opts.sender.userId)
      points = parsed[1] === 'all' ? pointsOfUser : parsed[1]

      if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)
      if (pointsOfUser < points) throw Error(ERROR_NOT_ENOUGH_POINTS)
      if (points < (await this.settings.minimalBet)) throw Error(ERROR_MINIMAL_BET)

      await global.db.engine.insert('users.points', { id: opts.sender.userId, points: parseInt(points, 10) * -1 })
      if (_.random(0, 100, false) <= await this.settings.chanceToWin) {
        await global.db.engine.insert('users.points', { id: opts.sender.userId, points: parseInt(points, 10) * 2 })
        let updatedPoints = await global.systems.points.getPointsOf(opts.sender.userId)
        message = await global.commons.prepare('gambling.gamble.win', {
          pointsName: await global.systems.points.getPointsName(updatedPoints),
          points: updatedPoints
        })
        debug(message); global.commons.sendMessage(message, opts.sender)
      } else {
        message = await global.commons.prepare('gambling.gamble.lose', {
          pointsName: await global.systems.points.getPointsName(await global.systems.points.getPointsOf(opts.sender.userId)),
          points: await global.systems.points.getPointsOf(opts.sender.userId)
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
          points = await this.settings.minimalBet
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

module.exports = new Gamble()
