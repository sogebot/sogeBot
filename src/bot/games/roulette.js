'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
const commons = require('../commons')
import { command } from '../decorators';
import Game from './_interface'

/*
 * !roulette - 50/50 chance to timeout yourself
 */

class Roulette extends Game {
  constructor () {
    const dependsOn = [
      'systems.points'
    ]
    const settings = {
      timeout: 10,
      rewards: {
        winnerWillGet: 0,
        loserWillLose: 0
      }
    }

    super({ settings, dependsOn })
  }

  @command('!roulette')
  async main (opts) {
    opts.sender['message-type'] = 'chat' // force responses to chat

    let isAlive = _.random(0, 1, false)

    const [isMod] = await Promise.all([
      commons.isModerator(opts.sender)
    ])

    commons.sendMessage(global.translate('gambling.roulette.trigger'), opts.sender)
    if (commons.isBroadcaster(opts.sender)) {
      setTimeout(() => commons.sendMessage(global.translate('gambling.roulette.broadcaster'), opts.sender), 2000)
      return
    }

    if (isMod) {
      setTimeout(() => commons.sendMessage(global.translate('gambling.roulette.mod'), opts.sender), 2000)
      return
    }

    setTimeout(async () => {
      if (!isAlive) commons.timeout(opts.sender.username, null, this.settings.timeout)
      await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: isAlive ? Math.abs(Number(this.settings.rewards.winnerWillGet)) : -Math.abs(Number(this.settings.rewards.loserWillLose)) })
      commons.sendMessage(isAlive ? global.translate('gambling.roulette.alive') : global.translate('gambling.roulette.dead'), opts.sender)
    }, 2000)
  }
}

module.exports = new Roulette()
