import _ from 'lodash';
import { isMainThread } from '../cluster';

import { getOwner, prepare, sendMessage } from '../commons';
import { command, default_permission, helper, settings, ui } from '../decorators';
import Expects from '../expects';
import { permission } from '../permissions';
import System from './_interface';
import { error, warning } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Bets as BetsEntity, BetsParticipations } from '../entity/bets';
import { User } from '../entity/user';
import { isDbConnected } from '../helpers/database';

const ERROR_NOT_ENOUGH_OPTIONS = 'Expected more parameters';
const ERROR_ALREADY_OPENED = '1';
const ERROR_ZERO_BET = '2';
const ERROR_NOT_RUNNING = '3';
const ERROR_UNDEFINED_BET = '4';
const ERROR_IS_LOCKED = '5';
const ERROR_DIFF_BET = '6';
const ERROR_NOT_OPTION = '7';

/*
 * !bet                                                                          - gets an info about bet
 * !bet [option-index] [amount]                                                  - bet [amount] of points on [option]
 * !bet open [-timeout 5] -title "your bet title" option | option | option | ... - open a new bet with selected options
 *                                                                               - -timeout in minutes - optional: default 2
 *                                                                               - -title - must be in "" - optional
 * !bet close [option]                                                           - close a bet and select option as winner
 * !bet refund                                                                   - close a bet and refund all participants
 * !set betPercentGain [0-100]                                                   - sets amount of gain per option
 */

class Bets extends System {
  public dependsOn: string[] = ['systems.points'];

  @settings()
  @ui({ type: 'number-input', step: 1, min: 0, max: 100 })
  public betPercentGain = 20;

  constructor() {
    super();

    if (isMainThread) {
      this.checkIfBetExpired();
    }

    this.addWidget('bets', 'widget-title-bets', 'far fa-money-bill-alt');
  }

  sockets() {
    adminEndpoint(this.nsp, 'bets::getCurrentBet', async (cb) => {
      const currentBet = await getRepository(BetsEntity).findOne({
        relations: ['participations'],
        order: { createdAt: 'DESC' },
      });
      cb(null, currentBet);
    });

    adminEndpoint(this.nsp, 'close', async (option) => {
      const message = '!bet ' + (option === 'refund' ? option : 'close ' + option);
      global.tmi.message({
        message: {
          tags: { username: getOwner() },
          message,
        },
        skip: true,
      });
    });
  }

  public async checkIfBetExpired() {
    if (!isDbConnected) {
      return;
    }
    try {
      const currentBet = await getRepository(BetsEntity).findOne({
        relations: ['participations'],
        order: { createdAt: 'DESC' },
      });
      if (!currentBet || currentBet.isLocked) {
        throw Error(ERROR_NOT_RUNNING);
      }

      if (currentBet.endedAt <= Date.now()) {
        currentBet.isLocked = true;

        if (currentBet.participations.length > 0) {
          sendMessage(global.translate('bets.locked'), {
            username: global.oauth.botUsername,
            displayName: global.oauth.botUsername,
            userId: Number(global.oauth.botId),
            emotes: [],
            badges: {},
            'message-type': 'chat',
          });
        } else {
          sendMessage(global.translate('bets.removed'), {
            username: global.oauth.botUsername,
            displayName: global.oauth.botUsername,
            userId: Number(global.oauth.botId),
            emotes: [],
            badges: {},
            'message-type': 'chat',
          });
          await getRepository(BetsEntity).save(currentBet);
        }
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_RUNNING:
          break;
        default:
          error(e.stack);
          break;
      }
    }
    setTimeout(() => this.checkIfBetExpired(), 10000);
  }

  @command('!bet open')
  @default_permission(permission.MODERATORS)
  public async open(opts) {
    const currentBet = await getRepository(BetsEntity).findOne({
      relations: ['participations'],
      order: { createdAt: 'DESC' },
    });
    try {
      if (currentBet && !currentBet.isLocked) {
        throw new Error(ERROR_ALREADY_OPENED);
      }

      const [timeout, title, options] = new Expects(opts.parameters)
        .argument({ name: 'timeout', optional: true, default: 2, type: Number })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray();
      if (options.length < 2) {
        throw new Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      const bet = new BetsEntity();
      bet.createdAt = Date.now();
      bet.endedAt = Date.now() + (timeout * 1000 * 60);
      bet.title = title;
      bet.options = options;
      await getRepository(BetsEntity).save(bet);

      sendMessage(await prepare('bets.opened', {
        username: getOwner(),
        title,
        maxIndex: String(options.length - 1),
        minutes: timeout,
        options: options.map((v, i) => `${i+1}. '${v}'`).join(', '),
        command: this.getCommand('!bet'),
      }), opts.sender);
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          sendMessage(global.translate('bets.notEnoughOptions'), opts.sender, opts.attr);
          break;
        case ERROR_ALREADY_OPENED:
          sendMessage(
            prepare('bets.running', {
              command: this.getCommand('!bet'),
              maxIndex: String((currentBet as BetsEntity).options.length),
              options: (currentBet as BetsEntity).options.map((v, i) => `${i+1}. '${v}'`).join(', '),
            }), opts.sender);
          break;
        default:
          warning(e.stack);
          sendMessage(global.translate('core.error'), opts.sender, opts.attr);
      }
    }
  }

  public async info(opts) {
    const currentBet = await getRepository(BetsEntity).findOne({
      relations: ['participations'],
      order: { createdAt: 'DESC' },
    });
    if (!currentBet) {
      sendMessage(global.translate('bets.notRunning'), opts.sender, opts.attr);
    } else {
      sendMessage(await prepare(currentBet.isLocked ? 'bets.lockedInfo' : 'bets.info', {
        command: opts.command,
        title: currentBet.title,
        maxIndex: String(currentBet.options.length),
        options: currentBet.options.map((v, i) => `${i+1}. '${v}'`).join(', '),
        minutes: Number((currentBet.endedAt - Date.now()) / 1000 / 60).toFixed(1) }), opts.sender);
    }
  }

  public async participate(opts) {
    const currentBet = await getRepository(BetsEntity).findOne({
      relations: ['participations'],
      order: { createdAt: 'DESC' },
    });

    try {
      // tslint:disable-next-line:prefer-const
      let [index, points] = new Expects(opts.parameters).number({ optional: true }).points({ optional: true }).toArray();
      index--;
      if (!_.isNil(points) && !_.isNil(index)) {
        const pointsOfUser = await global.systems.points.getPointsOf(opts.sender.userId);
        let _betOfUser = currentBet?.participations.find(o => o.userId === opts.sender.userId);

        if (points === 'all' || points > pointsOfUser) {
          points = pointsOfUser;
        }

        if (points === 0) {
          throw Error(ERROR_ZERO_BET);
        }
        if (!currentBet) {
          throw Error(ERROR_NOT_RUNNING);
        }
        if (_.isNil(currentBet.options[index])) {
          throw Error(ERROR_UNDEFINED_BET);
        }
        if (currentBet.isLocked) {
          throw Error(ERROR_IS_LOCKED);
        }
        if (_betOfUser && _betOfUser.optionIdx !== index) {
          throw Error(ERROR_DIFF_BET);
        }

        if (!_betOfUser) {
          _betOfUser = new BetsParticipations();
          _betOfUser.username = opts.sender.username;
          _betOfUser.userId = Number(opts.sender.userId);
          _betOfUser.optionIdx = index;
          _betOfUser.points = 0;
          currentBet.participations.push(_betOfUser);
        }

        // add points
        _betOfUser.points = points + _betOfUser.points;

        // All OK
        await getRepository(User).decrement({ userId: opts.sender.userId }, 'points', points);
        await getRepository(BetsEntity).save(currentBet);
      } else {
        this.info(opts);
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          sendMessage(global.translate('bets.zeroBet')
            .replace(/\$pointsName/g, await global.systems.points.getPointsName(0)), opts.sender);
          break;
        case ERROR_NOT_RUNNING:
          sendMessage(global.translate('bets.notRunning'), opts.sender, opts.attr);
          break;
        case ERROR_UNDEFINED_BET:
          sendMessage(await prepare('bets.undefinedBet', { command: opts.command }), opts.sender, opts.attr);
          break;
        case ERROR_IS_LOCKED:
          sendMessage(global.translate('bets.timeUpBet'), opts.sender, opts.attr);
          break;
        case ERROR_DIFF_BET:
          const result = (currentBet as BetsEntity).participations.find(o => o.userId === opts.sender.userId);
          sendMessage(global.translate('bets.diffBet').replace(/\$option/g, result?.optionIdx), opts.sender, opts.attr);
          break;
        default:
          warning(e.stack);
          sendMessage((await prepare('bets.error', { command: opts.command })).replace(/\$maxIndex/g, String((currentBet as BetsEntity).options.length)), opts.sender, opts.attr);
      }
    }
  }

  @command('!bet refund')
  @default_permission(permission.MODERATORS)
  public async refund(opts) {
    const currentBet = await getRepository(BetsEntity).findOne({
      relations: ['participations'],
      order: { createdAt: 'DESC' },
    });
    try {
      if (!currentBet || (currentBet.isLocked && currentBet.arePointsGiven)) {
        throw Error(ERROR_NOT_RUNNING);
      }
      for (const user of currentBet.participations) {
        await getRepository(User).increment({ userId: opts.sender.userId }, 'points', user.points);
      }
      sendMessage(global.translate('bets.refund'), opts.sender, opts.attr);
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_RUNNING:
          sendMessage(global.translate('bets.notRunning'), opts.sender, opts.attr);
          break;
        default:
          warning(e.stack);
          sendMessage(global.translate('core.error'), opts.sender, opts.attr);
      }
    } finally {
      if (currentBet) {
        currentBet.arePointsGiven = true;
        currentBet.isLocked = true;
        await getRepository(BetsEntity).save(currentBet);
      }
    }
  }

  @command('!bet close')
  @default_permission(permission.MODERATORS)
  public async close(opts) {
    const currentBet = await getRepository(BetsEntity).findOne({
      relations: ['participations'],
      order: { createdAt: 'DESC' },
    });
    try {
      const index = new Expects(opts.parameters).number().toArray()[0];

      if (!currentBet || currentBet.arePointsGiven) {
        throw Error(ERROR_NOT_RUNNING);
      }
      if (_.isNil(currentBet.options[index])) {
        throw Error(ERROR_NOT_OPTION);
      }

      const percentGain = (currentBet.options.length * this.betPercentGain) / 100;

      let total = 0;
      for (const user of currentBet.participations) {
        if (user.optionIdx === index) {
          total += user.points + Math.round((user.points * percentGain));
          await getRepository(User).increment({ userId: opts.sender.userId }, 'points', user.points + Math.round((user.points * percentGain)));
        }
      }

      sendMessage(global.translate('bets.closed')
        .replace(/\$option/g, currentBet.options[index])
        .replace(/\$amount/g, currentBet.participations.filter((o) => o.optionIdx === index).length)
        .replace(/\$pointsName/g, await global.systems.points.getPointsName(total))
        .replace(/\$points/g, total), opts.sender);

      currentBet.arePointsGiven = true;
      currentBet.isLocked = true;
      await getRepository(BetsEntity).save(currentBet);
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          sendMessage(global.translate('bets.closeNotEnoughOptions'), opts.sender, opts.attr);
          break;
        case ERROR_NOT_RUNNING:
          sendMessage(global.translate('bets.notRunning'), opts.sender, opts.attr);
          break;
        case ERROR_NOT_OPTION:
          sendMessage(await prepare('bets.notOption', { command: opts.command }), opts.sender, opts.attr);
          break;
        default:
          warning(e.stack);
          sendMessage(global.translate('core.error'), opts.sender, opts.attr);
      }
    }
  }

  @command('!bet')
  @default_permission(permission.MODERATORS)
  @helper()
  public main(opts) {
    if (opts.parameters.length === 0) {
      this.info(opts);
    } else {
      this.participate(opts);
    }
  }
}

export default Bets;
export { Bets };
