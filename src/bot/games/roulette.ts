import _ from 'lodash';

import { isBroadcaster, isModerator, sendMessage, timeout } from '../commons';
import { command, settings } from '../decorators';
import Game from './_interface';

import { getRepository } from 'typeorm';
import { User } from '../entity/user';

/*
 * !roulette - 50/50 chance to timeout yourself
 */

class Roulette extends Game {
  dependsOn = ['systems.points'];

  @settings()
  timeout = 10;

  @settings('rewards')
  winnerWillGet = 0;
  @settings('rewards')
  loserWillLose = 0;

  @command('!roulette')
  async main (opts) {
    opts.sender['message-type'] = 'chat'; // force responses to chat

    const isAlive = _.random(0, 1, false);

    const [isMod] = await Promise.all([
      isModerator(opts.sender),
    ]);

    sendMessage(global.translate('gambling.roulette.trigger'), opts.sender, opts.attr);
    if (isBroadcaster(opts.sender)) {
      setTimeout(() => sendMessage(global.translate('gambling.roulette.broadcaster'), opts.sender), 2000, opts.attr);
      return;
    }

    if (isMod) {
      setTimeout(() => sendMessage(global.translate('gambling.roulette.mod'), opts.sender), 2000, opts.attr);
      return;
    }

    setTimeout(async () => {
      if (!isAlive) {
        timeout(opts.sender.username, null, this.timeout);
      }
      if (isAlive) {
        await getRepository(User).increment({ userId: opts.sender.userId }, 'points', Number(this.winnerWillGet));
      } else {
        await getRepository(User).decrement({ userId: opts.sender.userId }, 'points', Number(this.loserWillLose));
      }
      sendMessage(isAlive ? global.translate('gambling.roulette.alive') : global.translate('gambling.roulette.dead'), opts.sender, opts.attr);
    }, 2000);
  }
}

export default Roulette;
export { Roulette };

