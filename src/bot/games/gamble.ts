import _ from 'lodash';

import Game from './_interface';
import { command, settings } from '../decorators';
import { prepare, sendMessage } from '../commons';

const ERROR_NOT_ENOUGH_OPTIONS = '0';
const ERROR_ZERO_BET = '1';
const ERROR_NOT_ENOUGH_POINTS = '2';
const ERROR_MINIMAL_BET = '3';

/*
 * !gamble [amount] - gamble [amount] points with `chanceToWin` chance
 */

class Gamble extends Game {
  dependsOn = [  'systems.points' ];

  @settings()
  minimalBet: number = 0;
  @settings()
  chanceToWin: number = 50;

  @command('!gamble')
  async main (opts) {
    let points, message;

    opts.sender['message-type'] = 'chat'; // force responses to chat
    try {
      let parsed = opts.parameters.trim().match(/^([\d]+|all)$/);
      if (_.isNil(parsed)) {throw Error(ERROR_NOT_ENOUGH_OPTIONS);}

      const pointsOfUser = await global.systems.points.getPointsOf(opts.sender.userId);
      points = parsed[1] === 'all' ? pointsOfUser : parsed[1];

      if (parseInt(points, 10) === 0) {throw Error(ERROR_ZERO_BET);}
      if (pointsOfUser < points) {throw Error(ERROR_NOT_ENOUGH_POINTS);}
      if (points < (this.minimalBet)) {throw Error(ERROR_MINIMAL_BET);}

      await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: parseInt(points, 10) * -1 });
      if (_.random(0, 100, false) <= this.chanceToWin) {
        await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: parseInt(points, 10) * 2 });
        let updatedPoints = await global.systems.points.getPointsOf(opts.sender.userId);
        message = await prepare('gambling.gamble.win', {
          pointsName: await global.systems.points.getPointsName(updatedPoints),
          points: updatedPoints
        });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        message = await prepare('gambling.gamble.lose', {
          pointsName: await global.systems.points.getPointsName(await global.systems.points.getPointsOf(opts.sender.userId)),
          points: await global.systems.points.getPointsOf(opts.sender.userId)
        });
        sendMessage(message, opts.sender, opts.attr);
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          message = await prepare('gambling.gamble.zeroBet', {
            pointsName: await global.systems.points.getPointsName(0)
          });
          sendMessage(message, opts.sender, opts.attr);
          break;
        case ERROR_NOT_ENOUGH_OPTIONS:
          sendMessage(global.translate('gambling.gamble.notEnoughOptions'), opts.sender, opts.attr);
          break;
        case ERROR_NOT_ENOUGH_POINTS:
          message = await prepare('gambling.gamble.notEnoughPoints', {
            pointsName: await global.systems.points.getPointsName(points),
            points: points
          });
          sendMessage(message, opts.sender, opts.attr);
          break;
        case ERROR_MINIMAL_BET:
          points = this.minimalBet;
          message = await prepare('gambling.gamble.lowerThanMinimalBet', {
            pointsName: await global.systems.points.getPointsName(points),
            points: points
          });
          sendMessage(message, opts.sender, opts.attr);
          break;
        default:
          global.log.error(e.stack);
          sendMessage(global.translate('core.error'), opts.sender, opts.attr);
      }
    }
  }
}

export default Gamble;
export { Gamble };