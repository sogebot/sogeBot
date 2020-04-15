import _ from 'lodash';
import { isMainThread } from '../cluster';

import { getOwner, prepare, sendMessage } from '../commons';
import { command, default_permission, helper, settings, ui } from '../decorators';
import Expects from '../expects';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { error, warning } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Bets as BetsEntity, BetsInterface } from '../database/entity/bets';
import { User } from '../database/entity/user';
import { isDbConnected } from '../helpers/database';
import oauth from '../oauth';
import { translate } from '../translate';
import tmi from '../tmi';
import points from './points';

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
  public dependsOn = [ points ];

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
      try {
        const currentBet = await getRepository(BetsEntity).findOne({
          relations: ['participations'],
          order: { createdAt: 'DESC' },
        });
        cb(null, currentBet);
      } catch (e) {
        cb(e.stack);
      }
    });

    adminEndpoint(this.nsp, 'close', async (option) => {
      const message = '!bet ' + (option === 'refund' ? option : 'close ' + option);
      tmi.message({
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
        if (currentBet.participations.length > 0) {
          sendMessage(translate('bets.locked'), {
            username: oauth.botUsername,
            displayName: oauth.botUsername,
            userId: Number(oauth.botId),
            emotes: [],
            badges: {},
            'message-type': 'chat',
          });
        } else {
          sendMessage(translate('bets.removed'), {
            username: oauth.botUsername,
            displayName: oauth.botUsername,
            userId: Number(oauth.botId),
            emotes: [],
            badges: {},
            'message-type': 'chat',
          });
          await getRepository(BetsEntity).save({...currentBet, isLocked: true});
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

      await getRepository(BetsEntity).save({
        createdAt: Date.now(),
        endedAt: Date.now() + (timeout * 1000 * 60),
        title: title,
        options: options,
      });

      sendMessage(prepare('bets.opened', {
        username: getOwner(),
        title,
        maxIndex: options.length,
        minutes: timeout,
        options: options.map((v, i) => `${i+1}. '${v}'`).join(', '),
        command: this.getCommand('!bet'),
      }), opts.sender);
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          sendMessage(translate('bets.notEnoughOptions'), opts.sender, opts.attr);
          break;
        case ERROR_ALREADY_OPENED:
          sendMessage(
            prepare('bets.running', {
              command: this.getCommand('!bet'),
              maxIndex: String((currentBet as BetsInterface).options.length),
              options: (currentBet as BetsInterface).options.map((v, i) => `${i+1}. '${v}'`).join(', '),
            }), opts.sender);
          break;
        default:
          sendMessage([this.getCommand('!bet open'), e.message].join(' '), opts.sender, opts.attr);
      }
    }
  }

  public async info(opts) {
    const currentBet = await getRepository(BetsEntity).findOne({
      relations: ['participations'],
      order: { createdAt: 'DESC' },
    });
    if (!currentBet) {
      sendMessage(translate('bets.notRunning'), opts.sender, opts.attr);
    } else {
      sendMessage(prepare(currentBet.isLocked ? 'bets.lockedInfo' : 'bets.info', {
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
      let [index, tickets] = new Expects(opts.parameters).number({ optional: true }).points({ optional: true }).toArray();
      index--;
      if (!_.isNil(tickets) && !_.isNil(index)) {
        const pointsOfUser = await points.getPointsOf(opts.sender.userId);
        const _betOfUser = currentBet?.participations.find(o => o.userId === opts.sender.userId);

        if (tickets === 'all' || tickets > pointsOfUser) {
          tickets = pointsOfUser;
        }

        if (tickets === 0) {
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
          currentBet.participations.push({
            username: opts.sender.username,
            userId: Number(opts.sender.userId),
            optionIdx: index,
            points: tickets,
          });
        } else {
          // add points
          _betOfUser.points = tickets + _betOfUser.points;
        }

        // All OK
        await points.decrement({ userId: opts.sender.userId }, tickets);
        await getRepository(BetsEntity).save(currentBet);
      } else {
        this.info(opts);
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          sendMessage(translate('bets.zeroBet')
            .replace(/\$pointsName/g, await points.getPointsName(0)), opts.sender);
          break;
        case ERROR_NOT_RUNNING:
          sendMessage(translate('bets.notRunning'), opts.sender, opts.attr);
          break;
        case ERROR_UNDEFINED_BET:
          sendMessage(prepare('bets.undefinedBet', { command: opts.command }), opts.sender, opts.attr);
          break;
        case ERROR_IS_LOCKED:
          sendMessage(translate('bets.timeUpBet'), opts.sender, opts.attr);
          break;
        case ERROR_DIFF_BET:
          const result = (currentBet as Required<BetsInterface>).participations.find(o => o.userId === opts.sender.userId);
          sendMessage(translate('bets.diffBet').replace(/\$option/g, result?.optionIdx), opts.sender, opts.attr);
          break;
        default:
          warning(e.stack);
          sendMessage((prepare('bets.error', { command: opts.command })).replace(/\$maxIndex/g, String((currentBet as BetsInterface).options.length)), opts.sender, opts.attr);
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
      sendMessage(translate('bets.refund'), opts.sender, opts.attr);
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_RUNNING:
          sendMessage(translate('bets.notRunning'), opts.sender, opts.attr);
          break;
        default:
          warning(e.stack);
          sendMessage(translate('core.error'), opts.sender, opts.attr);
      }
    } finally {
      if (currentBet) {
        await getRepository(BetsEntity).save({...currentBet, arePointsGiven: true, isLocked: true});
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

      sendMessage(translate('bets.closed')
        .replace(/\$option/g, currentBet.options[index])
        .replace(/\$amount/g, currentBet.participations.filter((o) => o.optionIdx === index).length)
        .replace(/\$pointsName/g, await points.getPointsName(total))
        .replace(/\$points/g, total), opts.sender);

      await getRepository(BetsEntity).save({...currentBet, arePointsGiven: true, isLocked: true});
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          sendMessage(translate('bets.closeNotEnoughOptions'), opts.sender, opts.attr);
          break;
        case ERROR_NOT_RUNNING:
          sendMessage(translate('bets.notRunning'), opts.sender, opts.attr);
          break;
        case ERROR_NOT_OPTION:
          sendMessage(prepare('bets.notOption', { command: opts.command }), opts.sender, opts.attr);
          break;
        default:
          warning(e.stack);
          sendMessage(translate('core.error'), opts.sender, opts.attr);
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

export default new Bets();
