import _ from 'lodash';

import { isBroadcaster, isModerator, timeout } from '../commons';
import { command, settings } from '../decorators';
import Game from './_interface';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import { translate } from '../translate';
import points from '../systems/points';

/*
 * !roulette - 50/50 chance to timeout yourself
 */

class Roulette extends Game {
  dependsOn = [ points ];

  @settings()
  timeout = 10;

  @settings('rewards')
  winnerWillGet = 0;
  @settings('rewards')
  loserWillLose = 0;

  @command('!roulette')
  async main (opts): Promise<CommandResponse[]> {
    opts.sender['message-type'] = 'chat'; // force responses to chat

    const isAlive = !!_.random(0, 1, false);

    const [isMod] = await Promise.all([
      isModerator(opts.sender),
    ]);

    const responses: CommandResponse[] = [];

    responses.push({ response: translate('gambling.roulette.trigger'), ...opts });
    if (isBroadcaster(opts.sender)) {
      responses.push({ response: translate('gambling.roulette.broadcaster'), ...opts });
      return responses;
    }

    if (isMod) {
      responses.push({ response: translate('gambling.roulette.mod'), ...opts });
      return responses;
    }

    setTimeout(async () => {
      if (!isAlive) {
        timeout(opts.sender.username, null, this.timeout);
      }
    }, 2000);

    if (isAlive) {
      await getRepository(User).increment({ userId: opts.sender.userId }, 'points', Number(this.winnerWillGet));
    } else {
      await points.decrement({ userId: opts.sender.userId }, Number(this.loserWillLose));
    }
    responses.push({ response: isAlive ? translate('gambling.roulette.alive') : translate('gambling.roulette.dead'), ...opts });
    return responses;
  }
}

export default new Roulette();

