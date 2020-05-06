import { isBroadcaster, isModerator, timeout } from '../commons';
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
      return [{ response: translate('gambling.seppuku.broadcaster'), ... opts }];
    }

    const isMod = isModerator(opts.sender);
    if (isMod) {
      return [{ response: translate('gambling.seppuku.mod'), ... opts }];
    }

    timeout(opts.sender.username, translate('gambling.seppuku.text'), this.timeout);
    return [{ response: translate('gambling.seppuku.text'), ... opts }];
  }
}

export default new Seppuku();

