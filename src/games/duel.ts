import { Duel as DuelEntity, DuelInterface } from '@entity/duel.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import { format } from '@sogebot/ui-helpers/number.js';
import _ from 'lodash-es';

import Game from './_interface.js';
import { onStartup } from '../decorators/on.js';
import {
  command, persistent, settings,
} from '../decorators.js';
import general from '../general.js';

import { AppDataSource } from '~/database.js';
import { announce, prepare } from '~/helpers/commons/index.js';
import { isDbConnected } from '~/helpers/database.js';
import { error } from '~/helpers/log.js';
import { getPointsName } from '~/helpers/points/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import { isBroadcaster } from '~/helpers/user/isBroadcaster.js';
import { isModerator } from '~/helpers/user/isModerator.js';
import { translate } from '~/translate.js';

const ERROR_NOT_ENOUGH_OPTIONS = '0';
const ERROR_ZERO_BET = '1';
const ERROR_NOT_ENOUGH_POINTS = '2';
const ERROR_MINIMAL_BET = '3';

/*
 * !duel [points]   - start or participate in duel
 */

class Duel extends Game {
  dependsOn = ['systems.points'];

  @persistent()
    _timestamp = 0;
  _cooldown = Date.now();

  @settings()
    cooldown = 0;
  @settings()
    duration = 5;
  @settings()
    minimalBet = 0;
  @settings()
    bypassCooldownByOwnerAndMods = false;

  @onStartup()
  onStartup() {
    this.pickDuelWinner();
  }

  async pickDuelWinner () {
    clearTimeout(this.timeouts.pickDuelWinner);

    if (!isDbConnected) {
      this.timeouts.pickDuelWinner = global.setTimeout(() => this.pickDuelWinner(), 1000);
      return;
    }

    const [users, timestamp, duelDuration] = await Promise.all([
      AppDataSource.getRepository(DuelEntity).find(),
      this._timestamp,
      this.duration,
    ]);
    const total = users.reduce((a, b) => a + b.tickets, 0);

    if (timestamp === 0 || Date.now() - timestamp < 1000 * 60 * duelDuration) {
      this.timeouts.pickDuelWinner = global.setTimeout(() => this.pickDuelWinner(), 30000);
      return;
    }

    if (total === 0 && Date.now() - timestamp >= 1000 * 60 * duelDuration) {
      this._timestamp = 0;
      return;
    }

    let winner = _.random(0, total, false);
    let winnerUser: Required<DuelInterface> | undefined;
    for (const user of users) {
      winner = winner - user.tickets;
      if (winner <= 0) { // winner tickets are <= 0 , we have winner
        winnerUser = user;
        break;
      }
    }

    if (winnerUser) {
      const probability = winnerUser.tickets / (total / 100);

      const m = prepare(users.length === 1 ? 'gambling.duel.noContestant' : 'gambling.duel.winner', {
        pointsName:  getPointsName(total),
        points:      format(general.numberFormat, 0)(total),
        probability: _.round(probability, 2),
        ticketsName: getPointsName(winnerUser.tickets),
        tickets:     format(general.numberFormat, 0)(winnerUser.tickets),
        winner:      winnerUser.username,
      });
      announce(m, 'duel');

      // give user his points
      await changelog.flush();
      changelog.increment(winnerUser.id, { points: total });

      // reset duel
      await AppDataSource.getRepository(DuelEntity).clear();
      this._timestamp = 0;

      this.timeouts.pickDuelWinner = global.setTimeout(() => this.pickDuelWinner(), 30000);
    }
  }

  @command('!duel bank')
  async bank (opts: CommandOptions) {
    const users = await AppDataSource.getRepository(DuelEntity).find();
    const bank = users.map((o) => o.tickets).reduce((a, b) => a + b, 0);

    return [{
      response: prepare('gambling.duel.bank', {
        command:    this.getCommand('!duel'),
        points:     format(general.numberFormat, 0)(bank),
        pointsName: getPointsName(bank),
      }),
      ...opts,
    }];
  }

  @command('!duel')
  async main (opts: CommandOptions) {
    const points = (await import('../systems/points.js')).default;
    const responses: CommandResponse[] = [];
    let bet;

    try {
      const parsed = opts.parameters.trim().match(/^([\d]+|all)$/);
      if (_.isNil(parsed)) {
        throw Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      const pointsOfUser = await points.getPointsOf(opts.sender.userId);
      bet = parsed[1] === 'all' ? pointsOfUser : Number(parsed[1]);

      if (pointsOfUser === 0) {
        throw Error(ERROR_ZERO_BET);
      }
      if (pointsOfUser < bet) {
        throw Error(ERROR_NOT_ENOUGH_POINTS);
      }
      if (bet < (this.minimalBet)) {
        throw Error(ERROR_MINIMAL_BET);
      }

      // check if user is already in duel and add points
      const userFromDB = await AppDataSource.getRepository(DuelEntity).findOneBy({ id: opts.sender.userId });
      const isNewDuelist = !userFromDB;
      if (userFromDB) {
        await AppDataSource.getRepository(DuelEntity).save({ ...userFromDB, tickets: Number(userFromDB.tickets) + Number(bet) });
        await points.decrement({ userId: opts.sender.userId }, bet);
      } else {
        // check if under gambling cooldown
        const cooldown = this.cooldown;
        const isMod = isModerator(opts.sender);
        if (Date.now() - new Date(this._cooldown).getTime() > cooldown * 1000
          || (this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
          // save new cooldown if not bypassed
          if (!(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
            this._cooldown = Date.now();
          }
          await AppDataSource.getRepository(DuelEntity).save({
            id:       opts.sender.userId,
            username: opts.sender.userName,
            tickets:  Number(bet),
          });
          await points.decrement({ userId: opts.sender.userId }, bet);
        } else {
          const response = prepare('gambling.fightme.cooldown', {
            minutesName: getLocalizedName(Math.round(((cooldown * 1000) - (Date.now() - new Date(this._cooldown).getTime())) / 1000 / 60), translate('core.minutes')),
            cooldown:    Math.round(((cooldown * 1000) - (Date.now() - new Date(this._cooldown).getTime())) / 1000 / 60),
            command:     opts.command,
          });
          return [{ response, ...opts }];
        }
      }

      // if new duel, we want to save timestamp
      const isNewDuel = (this._timestamp) === 0;
      if (isNewDuel) {
        this._timestamp = Number(new Date());
        const response = prepare('gambling.duel.new', {
          sender:      opts.sender,
          minutesName: getLocalizedName(5, translate('core.minutes')),
          minutes:     this.duration,
          command:     opts.command,
        });
        // if we have discord, we want to send notice on twitch channel as well
        announce(response, 'duel');
      }

      const tickets = (await AppDataSource.getRepository(DuelEntity).findOneBy({ id: opts.sender.userId }))?.tickets ?? 0;
      const response = prepare(isNewDuelist ? 'gambling.duel.joined' : 'gambling.duel.added', {
        pointsName: getPointsName(tickets),
        points:     format(general.numberFormat, 0)(tickets),
      });
      responses.push({ response, ...opts });
    } catch (e: any) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          responses.push({ response: translate('gambling.duel.notEnoughOptions'), ...opts });
          break;
        case ERROR_ZERO_BET:
          responses.push({ response: prepare('gambling.duel.zeroBet', { pointsName: getPointsName(0) }), ...opts });
          break;
        case ERROR_NOT_ENOUGH_POINTS:
          responses.push({
            response: prepare('gambling.duel.notEnoughPoints', {
              pointsName: getPointsName(bet ?? 0),
              points:     format(general.numberFormat, 0)(bet ?? 0),
            }), ...opts,
          });
          break;
        case ERROR_MINIMAL_BET:
          bet = this.minimalBet;
          responses.push({
            response: prepare('gambling.duel.lowerThanMinimalBet', {
              pointsName: getPointsName(bet),
              points:     format(general.numberFormat, 0)(bet),
              command:    opts.command,
            }), ...opts,
          });
          break;
        /* istanbul ignore next */
        default:
          error(e.stack);
          responses.push({ response: translate('core.error'), ...opts });
      }
    }
    return responses;
  }
}

export default new Duel();
