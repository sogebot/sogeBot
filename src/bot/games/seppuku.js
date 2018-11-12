const Game = require('./_interface')

/*
 * !seppuku         - timeout yourself
 */

class Seppuku extends Game {
  constructor () {
    const settings = {
      timeout: 10,
      commands: [
        '!seppuku'
      ]
    }
    super({ settings })
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
    global.commons.timeout(opts.sender.username, global.translate('gambling.seppuku.text'), this.settings.timeout)
  }
}

module.exports = new Seppuku()
