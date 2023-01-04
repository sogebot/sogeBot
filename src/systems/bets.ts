import { Bets as BetsEntity } from '@entity/bets';
import { format } from '@sogebot/ui-helpers/number';
import _ from 'lodash';

import { parserReply } from '../commons';
import {
  command, default_permission, helper, settings, ui,
} from '../decorators';
import { onStartup } from '../decorators/on';
import Expects from '../expects';
import general from '../general.js';
import System from './_interface';

import {
  announce, getBotSender, getOwner, prepare,
} from '~/helpers/commons';
import { isDbConnected } from '~/helpers/database';
import { error, warning } from '~/helpers/log';
import defaultPermissions from '~/helpers/permissions/defaultPermissions';
import { getPointsName } from '~/helpers/points';
import { adminEndpoint } from '~/helpers/socket';
import * as changelog from '~/helpers/user/changelog.js';

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

let isEndAnnounced = false;

class Bets extends System {
  public dependsOn = [ 'systems.points' ];

  @settings()
  @ui({
    type: 'number-input', step: 1, min: 0, max: 100,
  })
  public betPercentGain = 20;

  @onStartup()
  public async checkIfBetExpired() {
    if (!isDbConnected) {
      setTimeout(() => this.checkIfBetExpired(), 1000);
      return;
    }
    try {
      const currentBet = (await BetsEntity.find({
        order: { createdAt: 'DESC' },
        take:  1,
      }))[0];
      if (!currentBet || currentBet.isLocked) {
        throw Error(ERROR_NOT_RUNNING);
      }

      if (new Date(currentBet.endedAt || 0).getTime() < Date.now()) {
        if (currentBet.participants.length > 0) {
          if (!isEndAnnounced) {
            announce(prepare('bets.locked'), 'bets');
            isEndAnnounced = true;
          }
        } else {
          announce(prepare('bets.removed'), 'bets');
        }
        await BetsEntity.update({ id: currentBet.id }, { isLocked: true });
      } else {
        // bet is running;
        isEndAnnounced = false;
      }
    } catch (e: any) {
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

  sockets() {
    adminEndpoint('/systems/bets', 'bets::getCurrentBet', async (cb) => {
      try {
        const currentBet = (await BetsEntity.find({
          order: { createdAt: 'DESC' },
          take:  1,
        }))[0];
        cb(null, currentBet);
      } catch (e: any) {
        cb(e.stack);
      }
    });

    adminEndpoint('/systems/bets', 'bets::close', async (option) => {
      let responses: CommandResponse[];
      if (option === 'refund') {
        responses = await bets.refund({
          sender:             getBotSender(),
          createdAt:          Date.now(),
          parameters:         '',
          command:            bets.getCommand('!bet refund'),
          attr:               {},
          isAction:           false,
          isFirstTimeMessage: false,
          emotesOffsets:      new Map(),
          discord:            undefined,
        });
      } else {
        responses = await bets.close({
          sender:             getBotSender(),
          createdAt:          Date.now(),
          parameters:         `${option}`,
          command:            bets.getCommand('!bet close'),
          attr:               {},
          isAction:           false,
          isFirstTimeMessage: false,
          emotesOffsets:      new Map(),
          discord:            undefined,
        });
      }
      for (let i = 0; i < responses.length; i++) {
        await parserReply(responses[i].response, { sender: responses[i].sender, discord: responses[i].discord, id: '' });
      }
    });
  }

  @command('!bet open')
  @default_permission(defaultPermissions.MODERATORS)
  public async open(opts: CommandOptions): Promise<CommandResponse[]> {
    const currentBet = (await BetsEntity.find({
      order: { createdAt: 'DESC' },
      take:  1,
    }))[0];
    try {
      if (currentBet && !currentBet.isLocked) {
        throw new Error(ERROR_ALREADY_OPENED);
      }

      const [timeout, title, options] = new Expects(opts.parameters)
        .argument({
          name: 'timeout', optional: true, default: 2, type: Number,
        })
        .argument({
          name: 'title', optional: false, multi: true,
        })
        .list({ delimiter: '|' })
        .toArray() as [number, string, string[]];
      if (options.length < 2) {
        throw new Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      const bet = new BetsEntity({
        createdAt: new Date().toISOString(),
        endedAt:   new Date(Date.now() + (timeout * 1000 * 60)).toISOString(),
        title:     title,
        options:   options,
      });
      await bet.save();

      return [{
        response: prepare('bets.opened', {
          username: getOwner(),
          title,
          maxIndex: options.length,
          minutes:  timeout,
          options:  options.map((v, i) => `${i+1}. '${v}'`).join(', '),
          command:  this.getCommand('!bet'),
        }), ...opts,
      }];
    } catch (e: any) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          return [{ response: prepare('bets.notEnoughOptions'), ...opts }];
        case ERROR_ALREADY_OPENED:
          return [{
            response: prepare('bets.running', {
              command:  this.getCommand('!bet'),
              maxIndex: String(currentBet!.options.length),
              options:  currentBet!.options.map((v, i) => `${i+1}. '${v}'`).join(', '),
            }), ...opts,
          }];
        default:
          return [{ response: [this.getCommand('!bet open'), e.message].join(' '), ...opts }];
      }
    }
  }

  public async info(opts: CommandOptions) {
    const currentBet = (await BetsEntity.find({
      order: { createdAt: 'DESC' },
      take:  1,
    }))[0];
    if (!currentBet || (currentBet.isLocked && currentBet.arePointsGiven)) {
      return [{ response: prepare('bets.notRunning'), ...opts } ];
    } else {
      return [{
        response: prepare(currentBet.isLocked ? 'bets.lockedInfo' : 'bets.info', {
          command:  opts.command,
          title:    currentBet.title,
          maxIndex: String(currentBet.options.length),
          options:  currentBet.options.map((v, i) => `${i+1}. '${v}'`).join(', '),
          minutes:  Number((new Date(currentBet!.endedAt || 0).getTime() - Date.now()) / 1000 / 60).toFixed(1),
        }), ...opts,
      }];
    }
  }

  public async participate(opts: CommandOptions): Promise<CommandResponse[]> {
    const points = (await import('../systems/points')).default;
    const currentBet = (await BetsEntity.find({
      order: { createdAt: 'DESC' },
      take:  1,
    }))[0];

    try {
      // tslint:disable-next-line:prefer-const
      let [index, tickets] = new Expects(opts.parameters).number({ optional: true }).points({ optional: true }).toArray();
      index--;
      if (!_.isNil(tickets) && !_.isNil(index)) {
        const pointsOfUser = await points.getPointsOf(opts.sender.userId);
        const _betOfUser = currentBet?.participants.find(o => String(o.userId) === opts.sender.userId);

        if (tickets === 'all' || tickets > pointsOfUser) {
          tickets = pointsOfUser;
        }

        if (tickets === 0) {
          throw Error(ERROR_ZERO_BET);
        }
        if (!currentBet || (currentBet.isLocked && currentBet.arePointsGiven)) {
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
          currentBet.participants.push({
            username:  opts.sender.userName,
            userId:    opts.sender.userId,
            optionIdx: index,
            points:    tickets,
          });
        } else {
          // add points
          _betOfUser.points = tickets + _betOfUser.points;
        }

        // All OK
        await points.decrement({ userId: opts.sender.userId }, tickets);
        await BetsEntity.save(currentBet);
        return [];
      } else {
        return this.info(opts);
      }
    } catch (e: any) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          return [{ response: prepare('bets.zeroBet').replace(/\$pointsName/g, getPointsName(0)), ...opts }];
        case ERROR_NOT_RUNNING:
          return [{ response: prepare('bets.notRunning'), ...opts } ];
        case ERROR_UNDEFINED_BET:
          return [{ response: prepare('bets.undefinedBet', { command: opts.command }), ...opts }];
        case ERROR_IS_LOCKED:
          return [{ response: prepare('bets.timeUpBet'), ...opts } ];
        case ERROR_DIFF_BET: {
          const result = currentBet!.participants.find(o => String(o.userId) === String(opts.sender.userId));
          return [{ response: prepare('bets.diffBet').replace(/\$option/g, String((result?.optionIdx || 0) + 1)), ...opts } ];
        }
        default:
          warning(e.stack);
          return [{ response: prepare('bets.error', { command: opts.command }).replace(/\$maxIndex/g, String(currentBet!.options.length)), ...opts }];
      }
    }
  }

  @command('!bet refund')
  @default_permission(defaultPermissions.MODERATORS)
  public async refund(opts: CommandOptions): Promise<CommandResponse[]> {
    const currentBet = (await BetsEntity.find({
      order: { createdAt: 'DESC' },
      take:  1,
    }))[0];
    try {
      if (!currentBet || (currentBet.isLocked && currentBet.arePointsGiven)) {
        throw Error(ERROR_NOT_RUNNING);
      }
      for (const user of currentBet.participants) {
        changelog.increment(opts.sender.userId, { points: user.points });
      }
      return [{ response: prepare('bets.refund'), ...opts } ];
    } catch (e: any) {
      switch (e.message) {
        case ERROR_NOT_RUNNING:
          return [{ response: prepare('bets.notRunning'), ...opts } ];
          break;
        default:
          warning(e.stack);
          return [{ response: prepare('core.error'), ...opts } ];
      }
    } finally {
      if (currentBet) {
        await BetsEntity.update({ id: currentBet.id }, { arePointsGiven: true, isLocked: true });
      }
    }
  }

  @command('!bet close')
  @default_permission(defaultPermissions.MODERATORS)
  public async close(opts: CommandOptions): Promise<CommandResponse[]> {
    const currentBet = (await BetsEntity.find({
      order: { createdAt: 'DESC' },
      take:  1,
    }))[0];
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
      for (const user of currentBet.participants) {
        if (user.optionIdx === index) {
          total += user.points + Math.round((user.points * percentGain));
          changelog.increment(user.userId, { points: user.points + Math.round((user.points * percentGain)) });
        }
      }

      await BetsEntity.update({ id: currentBet.id }, { arePointsGiven: true, isLocked: true });
      return [{
        response: prepare('bets.closed')
          .replace(/\$option/g, currentBet.options[index])
          .replace(/\$amount/g, String(currentBet.participants.filter((o) => o.optionIdx === index).length))
          .replace(/\$pointsName/g, getPointsName(total))
          .replace(/\$points/g, format(general.numberFormat, 0)(total)),
        ...opts,
      }];

    } catch (e: any) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          return [{ response: prepare('bets.closeNotEnoughOptions'), ...opts } ];
        case ERROR_NOT_RUNNING:
          return [{ response: prepare('bets.notRunning'), ...opts } ];
        case ERROR_NOT_OPTION:
          return [{ response: prepare('bets.notOption', { command: opts.command }), ...opts }];
        default:
          warning(e.stack);
          return [{ response: prepare('core.error'), ...opts } ];
      }
    }
  }

  @command('!bet')
  @default_permission(defaultPermissions.VIEWERS)
  @helper()
  async main(opts: CommandOptions): Promise<CommandResponse[]> {
    if (opts.parameters.length === 0) {
      return this.info(opts);
    } else {
      return this.participate(opts);
    }
  }
}

const bets = new Bets();
export default bets;
