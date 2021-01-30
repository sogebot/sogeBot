import _ from 'lodash';
import { getRepository } from 'typeorm';

import { User } from '../database/entity/user';
import { command, settings } from '../decorators';
import { timeout } from '../helpers/tmi';
import { isBroadcaster } from '../helpers/user/isBroadcaster';
import { isModerator } from '../helpers/user/isModerator';
import points from '../systems/points';
import { translate } from '../translate';
import Game from './_interface';

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
  async main (opts: CommandOptions): Promise<(CommandResponse & { isAlive?: boolean })[]> {
    opts.sender['message-type'] = 'chat'; // force responses to chat

    const isAlive = !!_.random(0, 1, false);
    const isMod = isModerator(opts.sender);
    const responses: (CommandResponse & { isAlive?: boolean })[] = [];

    responses.push({ response: translate('gambling.roulette.trigger'), ...opts });
    if (isBroadcaster(opts.sender)) {
      responses.push({
        response: translate('gambling.roulette.broadcaster'), ...opts, isAlive: true,
      });
      return responses;
    }

    if (isMod) {
      responses.push({
        response: translate('gambling.roulette.mod'), ...opts, isAlive: true,
      });
      return responses;
    }

    setTimeout(async () => {
      if (!isAlive) {
        timeout(opts.sender.username, this.timeout, isModerator(opts.sender));
      }
    }, 2000);

    if (isAlive) {
      await getRepository(User).increment({ userId: opts.sender.userId }, 'points', Number(this.winnerWillGet));
    } else {
      await points.decrement({ userId: opts.sender.userId }, Number(this.loserWillLose));
    }
    responses.push({
      response: isAlive ? translate('gambling.roulette.alive') : translate('gambling.roulette.dead'), ...opts, isAlive,
    });
    return responses;
  }
}

export default new Roulette();
