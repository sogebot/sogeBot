import _ from 'lodash';

import Game from './_interface';
import { command, settings, shared } from '../decorators';
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

  @settings('jackpot')
  enableJackpot = false;
  @settings('jackpot')
  maxJackpotValue = 10000;
  @settings('jackpot')
  lostPointsAddedToJackpot = 20;
  @settings('jackpot')
  chanceToTriggerJackpot = 5;
  @shared(true)
  jackpotValue = 0;

  @command('!gamble')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    let points, message;

    opts.sender['message-type'] = 'chat'; // force responses to chat
    try {
      const parsed = opts.parameters.trim().match(/^([\d]+|all)$/);
      if (_.isNil(parsed)) {
        throw Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      const pointsOfUser = await pointsSystem.getPointsOf(opts.sender.userId);
      points = parsed[1] === 'all' ? pointsOfUser : Number(parsed[1]);

      if (points === 0) {
        throw Error(ERROR_ZERO_BET);
      }
      if (pointsOfUser < points) {
        throw Error(ERROR_NOT_ENOUGH_POINTS);
      }
      if (points < (this.minimalBet)) {
        throw Error(ERROR_MINIMAL_BET);
      }

      await pointsSystem.decrement({ userId: opts.sender.userId }, points);
      if (this.enableJackpot && _.random(0, 100, false) <= this.chanceToTriggerJackpot) {
        const incrementPointsWithJackpot = (points * 2) + this.jackpotValue;
        await getRepository(User).increment({ userId: opts.sender.userId }, 'points', incrementPointsWithJackpot);
        const currentPointsOfUser = await pointsSystem.getPointsOf(opts.sender.userId);
        message = prepare('gambling.gamble.winJackpot', {
          pointsName: await pointsSystem.getPointsName(currentPointsOfUser),
          points: currentPointsOfUser,
          jackpotName: await pointsSystem.getPointsName(this.jackpotValue),
          jackpot: this.jackpotValue,
        });
        this.jackpotValue = 0;
      } else  if (_.random(0, 100, false) <= this.chanceToWin) {
        await getRepository(User).increment({ userId: opts.sender.userId }, 'points', points * 2);
        const updatedPoints = await pointsSystem.getPointsOf(opts.sender.userId);
        message = prepare('gambling.gamble.win', {
          pointsName: await pointsSystem.getPointsName(updatedPoints),
          points: updatedPoints,
        });
      } else {
        if (this.enableJackpot) {
          const currentPointsOfUser = await pointsSystem.getPointsOf(opts.sender.userId);
          this.jackpotValue = Math.min(this.jackpotValue + points / this.lostPointsAddedToJackpot, this.maxJackpotValue);
          message = prepare('gambling.gamble.loseWithJackpot', {
            pointsName: await pointsSystem.getPointsName(currentPointsOfUser),
            points: currentPointsOfUser,
            jackpotName: await pointsSystem.getPointsName(this.jackpotValue),
            jackpot: this.jackpotValue,
          });
        } else {
          message = prepare('gambling.gamble.lose', {
            pointsName: await pointsSystem.getPointsName(await pointsSystem.getPointsOf(opts.sender.userId)),
            points: await pointsSystem.getPointsOf(opts.sender.userId),
          });
        }
      }
      return [{ response: message, ...opts }];
    } catch (e) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          message = prepare('gambling.gamble.zeroBet', {
            pointsName: await pointsSystem.getPointsName(0),
          });
          return [{ response: message, ...opts }];
        case ERROR_NOT_ENOUGH_OPTIONS:
          return [{ response: translate('gambling.gamble.notEnoughOptions'), ...opts }];
        case ERROR_NOT_ENOUGH_POINTS:
          message = prepare('gambling.gamble.notEnoughPoints', {
            pointsName: await pointsSystem.getPointsName(points ? Number(points) : 0),
            points: points,
          });
          return [{ response: message, ...opts }];
        case ERROR_MINIMAL_BET:
          points = this.minimalBet;
          message = prepare('gambling.gamble.lowerThanMinimalBet', {
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