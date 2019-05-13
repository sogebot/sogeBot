import Game from './_interface'
import { command } from '../decorators';
const commons = require('../commons')

/*
 * !seppuku         - timeout yourself
 */

class Seppuku extends Game {
  constructor () {
    const settings = {
      timeout: 10,
    }
    super({ settings })
  }

  @command('!seppuku')
  async main (opts) {
    if (commons.isBroadcaster(opts.sender)) {
      commons.sendMessage(global.translate('gambling.seppuku.broadcaster'), opts.sender)
      return
    }

    const isMod = await commons.isModerator(opts.sender)
    if (isMod) {
      commons.sendMessage(global.translate('gambling.seppuku.mod'), opts.sender)
      return
    }

    commons.sendMessage(global.translate('gambling.seppuku.text'), opts.sender)
    commons.timeout(opts.sender.username, global.translate('gambling.seppuku.text'), this.settings.timeout)
  }
}

module.exports = new Seppuku()
