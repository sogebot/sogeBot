import { isBroadcaster, isModerator, sendMessage, timeout } from '../commons';
import { command, settings } from '../decorators';
import Game from './_interface';

/*
 * !seppuku         - timeout yourself
 */

class Seppuku extends Game {
  @settings()
  timeout: number = 10;

  @command('!seppuku')
  async main (opts) {
    if (isBroadcaster(opts.sender)) {
      sendMessage(global.translate('gambling.seppuku.broadcaster'), opts.sender, opts.attr);
      return;
    }

    const isMod = await isModerator(opts.sender);
    if (isMod) {
      sendMessage(global.translate('gambling.seppuku.mod'), opts.sender, opts.attr);
      return;
    }

    sendMessage(global.translate('gambling.seppuku.text'), opts.sender, opts.attr);
    timeout(opts.sender.username, global.translate('gambling.seppuku.text'), this.timeout);
  }
}

export default Seppuku;
export { Seppuku };

