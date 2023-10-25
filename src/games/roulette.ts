import _ from 'lodash-es';

import Game from './_interface.js';
import { command, settings } from '../decorators.js';

import { tmiEmitter } from '~/helpers/tmi/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import { isBroadcaster } from '~/helpers/user/isBroadcaster.js';
import { isModerator } from '~/helpers/user/isModerator.js';
import { translate } from '~/translate.js';

/*
 * !roulette - 50/50 chance to timeout yourself
 */

class Roulette extends Game {
  dependsOn = [ 'systems.points' ];

  @settings()
    timeout = 10;

  @settings('rewards')
    winnerWillGet = 0;
  @settings('rewards')
    loserWillLose = 0;

  @command('!roulette')
  async main (opts: CommandOptions): Promise<(CommandResponse & { isAlive?: boolean })[]> {
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
        tmiEmitter.emit('timeout', opts.sender.userName, this.timeout, { mod: opts.sender.isMod });
      }
    }, 2000);

    if (isAlive) {
      changelog.increment(opts.sender.userId, { points: Number(this.winnerWillGet) });
    } else {
      changelog.increment(opts.sender.userId, { points: -Number(this.loserWillLose) });
    }
    responses.push({
      response: isAlive ? translate('gambling.roulette.alive') : translate('gambling.roulette.dead'), ...opts, isAlive,
    });
    return responses;
  }
}

export default new Roulette();
