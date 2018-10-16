'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
const Game = require('./_interface')

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
      commands: [
        '!roulette'
      ],
      rewards: {
        winnerWillGet: 0,
        loserWillLose: 0
      }
    }

    super({ settings, dependsOn })
  }

  async main (opts) {
    opts.sender['message-type'] = 'chat' // force responses to chat

    let isAlive = _.random(0, 1, false)

    const [isMod] = await Promise.all([
      global.commons.isMod(opts.sender)
    ])

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
      if (!isAlive) global.commons.timeout(opts.sender.username, null, await this.settings.timeout)
      await global.db.engine.insert('users.points', { id: opts.sender.userId, points: isAlive ? Math.abs(Number(this.settings.rewards.winnerWillGet)) : -Math.abs(Number(this.settings.rewards.loserWillLose)), __COMMENT__: (new Error()).stack })
      global.commons.sendMessage(isAlive ? global.translate('gambling.roulette.alive') : global.translate('gambling.roulette.dead'), opts.sender)
    }, 2000)
  }
}

module.exports = new Roulette()
