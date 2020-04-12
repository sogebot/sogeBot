import _ from 'lodash';

import Game from './_interface';
import { command, settings } from '../decorators';
import { prepare } from '../commons';
import { error } from '../helpers/log';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import { translate } from '../translate';
import pointsSystem from '../systems/points';

const ERROR_NOT_ENOUGH_OPTIONS = '0';
const ERROR_ZERO_BET = '1';
const ERROR_NOT_ENOUGH_POINTS = '2';
const ERROR_MINIMAL_BET = '3';

/*
 * !gamble [amount] - gamble [amount] points with `chanceToWin` chance
 */

class Gamble extends Game {
  dependsOn = [ pointsSystem ];

  @settings()
  minimalBet = 0;
  @settings()
  chanceToWin = 50;

  @command('!gamble')
  async main (opts): Promise<CommandResponse[]> {
    let points, message;

    opts.sender['message-type'] = 'chat'; // force responses to chat
    try {
      const parsed = opts.parameters.trim().match(/^([\d]+|all)$/);
      if (_.isNil(parsed)) {
        throw Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      const pointsOfUser = await pointsSystem.getPointsOf(opts.sender.userId);
      points = parsed[1] === 'all' ? pointsOfUser : parsed[1];

      if (parseInt(points, 10) === 0) {
        throw Error(ERROR_ZERO_BET);
      }
      if (pointsOfUser < points) {
        throw Error(ERROR_NOT_ENOUGH_POINTS);
      }
      if (points < (this.minimalBet)) {
        throw Error(ERROR_MINIMAL_BET);
      }

      await pointsSystem.decrement({ userId: opts.sender.userId }, parseInt(points, 10));
      if (_.random(0, 100, false) <= this.chanceToWin) {
        await getRepository(User).increment({ userId: opts.sender.userId }, 'points', parseInt(points, 10) * 2);
        const updatedPoints = await pointsSystem.getPointsOf(opts.sender.userId);
        message = await prepare('gambling.gamble.win', {
          pointsName: await pointsSystem.getPointsName(updatedPoints),
          points: updatedPoints,
        });
        return [{ response: message, ...opts }];
      } else {
        message = await prepare('gambling.gamble.lose', {
          pointsName: await pointsSystem.getPointsName(await pointsSystem.getPointsOf(opts.sender.userId)),
          points: await pointsSystem.getPointsOf(opts.sender.userId),
        });
        return [{ response: message, ...opts }];
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          message = await prepare('gambling.gamble.zeroBet', {
            pointsName: await pointsSystem.getPointsName(0),
          });
          return [{ response: message, ...opts }];
        case ERROR_NOT_ENOUGH_OPTIONS:
          return [{ response: translate('gambling.gamble.notEnoughOptions'), ...opts }];
        case ERROR_NOT_ENOUGH_POINTS:
          message = await prepare('gambling.gamble.notEnoughPoints', {
            pointsName: await pointsSystem.getPointsName(points),
            points: points,
          });
          return [{ response: message, ...opts }];
        case ERROR_MINIMAL_BET:
          points = this.minimalBet;
          message = await prepare('gambling.gamble.lowerThanMinimalBet', {
            pointsName: await pointsSystem.getPointsName(points),
            points: points,
          });
          return [{ response: message, ...opts }];
        default:
          error(e.stack);
          return [{ response: translate('core.error'), ...opts }];
      }
    }
  }
}

export default new Gamble();