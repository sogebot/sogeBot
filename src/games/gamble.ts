import _ from 'lodash';
import { getRepository } from 'typeorm';

import { User } from '../database/entity/user';
import {
  command, permission_settings, persistent, settings,
} from '../decorators';
import { prepare } from '../helpers/commons';
import { error } from '../helpers/log';
import { getUserHighestPermission } from '../helpers/permissions/';
import { getPointsName } from '../helpers/points';
import pointsSystem from '../systems/points';
import { translate } from '../translate';
import Game from './_interface';

const ERROR_NOT_ENOUGH_OPTIONS = '0';
const ERROR_ZERO_BET = '1';
const ERROR_NOT_ENOUGH_POINTS = '2';

class MinimalBetError extends Error {
  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, MinimalBetError);
    this.name = 'MinimalBetError';
  }
}

/*
 * !gamble [amount] - gamble [amount] points with `chanceToWin` chance
 */

class Gamble extends Game {
  dependsOn = [ pointsSystem ];

  @permission_settings('settings')
  minimalBet = 0;
  @permission_settings('settings')
  chanceToWin = 50;
  @permission_settings('settings')
  chanceToTriggerJackpot = 5;

  @settings()
  enableJackpot = false;
  @settings()
  maxJackpotValue = 10000;
  @settings()
  lostPointsAddedToJackpot = 20;
  @persistent()
  jackpotValue = 0;

  @command('!gamble')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    let points, message;

    opts.sender['message-type'] = 'chat'; // force responses to chat
    try {
      const parsed = opts.parameters.trim().match(/^([\d]+|all)$/);
      if (_.isNil(parsed)) {
        throw Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      const permId = await getUserHighestPermission(opts.sender.userId);
      const pointsOfUser = await pointsSystem.getPointsOf(opts.sender.userId);
      points = parsed[1] === 'all' ? pointsOfUser : Number(parsed[1]);

      if (points === 0) {
        throw Error(ERROR_ZERO_BET);
      }
      if (pointsOfUser < points) {
        throw Error(ERROR_NOT_ENOUGH_POINTS);
      }

      const minimalBet = await this.getPermissionBasedSettingsValue('minimalBet');
      if (points < minimalBet[permId]) {
        throw new MinimalBetError(String(minimalBet[permId]));
      }

      await pointsSystem.decrement({ userId: opts.sender.userId }, points);

      const chanceToWin = await this.getPermissionBasedSettingsValue('chanceToWin');
      const chanceToTriggerJackpot = await this.getPermissionBasedSettingsValue('chanceToTriggerJackpot');
      if (this.enableJackpot && _.random(0, 100, false) <= chanceToTriggerJackpot[permId]) {
        const incrementPointsWithJackpot = (points * 2) + this.jackpotValue;
        await getRepository(User).increment({ userId: opts.sender.userId }, 'points', incrementPointsWithJackpot);
        const currentPointsOfUser = await pointsSystem.getPointsOf(opts.sender.userId);
        message = prepare('gambling.gamble.winJackpot', {
          pointsName:  getPointsName(currentPointsOfUser),
          points:      currentPointsOfUser,
          jackpotName: getPointsName(this.jackpotValue),
          jackpot:     this.jackpotValue,
        });
        this.jackpotValue = 0;
      } else if (_.random(0, 100, false) <= chanceToWin[permId]) {
        await getRepository(User).increment({ userId: opts.sender.userId }, 'points', points * 2);
        const updatedPoints = await pointsSystem.getPointsOf(opts.sender.userId);
        message = prepare('gambling.gamble.win', {
          pointsName: getPointsName(updatedPoints),
          points:     updatedPoints,
        });
      } else {
        if (this.enableJackpot) {
          const currentPointsOfUser = await pointsSystem.getPointsOf(opts.sender.userId);
          this.jackpotValue = Math.min(Math.ceil(this.jackpotValue + (points * (this.lostPointsAddedToJackpot / 100))), this.maxJackpotValue);
          message = prepare('gambling.gamble.loseWithJackpot', {
            pointsName:  getPointsName(currentPointsOfUser),
            points:      currentPointsOfUser,
            jackpotName: getPointsName(this.jackpotValue),
            jackpot:     this.jackpotValue,
          });
        } else {
          message = prepare('gambling.gamble.lose', {
            pointsName: getPointsName(await pointsSystem.getPointsOf(opts.sender.userId)),
            points:     await pointsSystem.getPointsOf(opts.sender.userId),
          });
        }
      }
      return [{ response: message, ...opts }];
    } catch (e) {
      if (e instanceof MinimalBetError) {
        message = prepare('gambling.gamble.lowerThanMinimalBet', {
          pointsName: getPointsName(Number(e.message)),
          points:     Number(e.message),
        });
        return [{ response: message, ...opts }];
      } else {
        switch (e.message) {
          case ERROR_ZERO_BET:
            message = prepare('gambling.gamble.zeroBet', { pointsName: getPointsName(0) });
            return [{ response: message, ...opts }];
          case ERROR_NOT_ENOUGH_OPTIONS:
            return [{ response: translate('gambling.gamble.notEnoughOptions'), ...opts }];
          case ERROR_NOT_ENOUGH_POINTS:
            message = prepare('gambling.gamble.notEnoughPoints', {
              pointsName: getPointsName(points ? Number(points) : 0),
              points:     points,
            });
            return [{ response: message, ...opts }];
          /* istanbul ignore next */
          default:
            error(e.stack);
            return [{ response: translate('core.error'), ...opts }];
        }
      }
    }
  }

  @command('!gamble jackpot')
  async jackpot (opts: CommandOptions): Promise<CommandResponse[]> {
    let message: string;
    if (this.enableJackpot) {
      message = prepare('gambling.gamble.currentJackpot', {
        command:    this.getCommand('!gamble'),
        pointsName: getPointsName(this.jackpotValue),
        points:     this.jackpotValue,
      });
    } else {
      message = prepare('gambling.gamble.jackpotIsDisabled', { command: this.getCommand('!gamble') });
    }
    return [{ response: message, ...opts }];
  }
}

export default new Gamble();