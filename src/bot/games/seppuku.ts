import { isBroadcaster, isModerator, sendMessage, timeout } from '../commons';
import { command, settings } from '../decorators';
import Game from './_interface';
import { translate } from '../translate';

/*
 * !seppuku         - timeout yourself
 */

class Seppuku extends Game {
  @settings()
  timeout = 10;

  @command('!seppuku')
  async main (opts) {
    if (isBroadcaster(opts.sender)) {
      sendMessage(translate('gambling.seppuku.broadcaster'), opts.sender, opts.attr);
      return;
    }

    const isMod = await isModerator(opts.sender);
    if (isMod) {
      sendMessage(translate('gambling.seppuku.mod'), opts.sender, opts.attr);
      return;
    }

    sendMessage(translate('gambling.seppuku.text'), opts.sender, opts.attr);
    timeout(opts.sender.username, translate('gambling.seppuku.text'), this.timeout);
  }
}

export default new Seppuku();

