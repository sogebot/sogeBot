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
    const collection = {
      settings: 'games.roulette.settings'
    }
    const dependsOn = [
      'systems.points'
    ]
    const settings = {
      commands: [
        '!roulette'
      ]
    }

    super({ collection, settings, dependsOn })

    global.configuration.register('rouletteTimeout', 'gambling.roulette.timeout', 'number', 10)
  }

  async main (opts) {
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
}

module.exports = new Roulette()
