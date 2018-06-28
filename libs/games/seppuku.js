const Game = require('./_interface')

/*
 * !seppuku         - timeout yourself
 */

class Seppuku extends Game {
  constructor () {
    const collection = {
      settings: 'games.seppuku.settings'
    }
    const settings = {
      commands: [
        '!seppuku'
      ]
    }
    super({collection, settings})

    global.configuration.register('seppukuTimeout', 'gambling.seppuku.timeout', 'number', 10)
  }

  async main (opts) {
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
}

module.exports = new Seppuku()
