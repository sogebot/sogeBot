import _ from 'lodash';
import { isMainThread } from '../cluster';

import { getLocalizedName, isBroadcaster, isModerator, prepare, sendMessage } from '../commons';
import { command, settings, shared } from '../decorators';
import Game from './_interface';
import { error } from '../helpers/log';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import { Duel as DuelEntity, DuelInterface } from '../database/entity/duel';
import oauth from '../oauth';
import { translate } from '../translate';
import points from '../systems/points';
import { isDbConnected } from '../helpers/database';

const ERROR_NOT_ENOUGH_OPTIONS = '0';
const ERROR_ZERO_BET = '1';
const ERROR_NOT_ENOUGH_POINTS = '2';
const ERROR_MINIMAL_BET = '3';

/*
 * !duel [points]   - start or participate in duel
 */

class Duel extends Game {
  dependsOn = [ points ];

  @shared()
  _timestamp = 0;
  @shared()
  _cooldown = String(new Date());

  @settings()
  cooldown = 0;
  @settings()
  duration = 5;
  @settings()
  minimalBet = 0;
  @settings()
  bypassCooldownByOwnerAndMods = false;

  constructor () {
    super();
    if (isMainThread) {
      this.pickDuelWinner();
    }
  }

  async pickDuelWinner () {
    clearTimeout(this.timeouts.pickDuelWinner);

    if (!isDbConnected) {
      this.timeouts.pickDuelWinner = global.setTimeout(() => this.pickDuelWinner(), 1000);
      return;
    }

    const [users, timestamp, duelDuration] = await Promise.all([
      getRepository(DuelEntity).find(),
      this._timestamp,
      this.duration,
    ]);
    const total = users.reduce((a, b) => a + b.tickets, 0);

    if (timestamp === 0 || new Date().getTime() - timestamp < 1000 * 60 * duelDuration) {
      this.timeouts.pickDuelWinner = global.setTimeout(() => this.pickDuelWinner(), 30000);
      return;
    }

    if (total === 0 && new Date().getTime() - timestamp >= 1000 * 60 * duelDuration) {
      await getRepository(DuelEntity).clear();
      this._timestamp = 0;
      return;
    }

    let winner = _.random(0, total, false);
    let winnerUser: DuelInterface | undefined;
    for (const user of users) {
      winner = winner - user.tickets;
      if (winner <= 0) { // winner tickets are <= 0 , we have winner
        winnerUser = user;
        break;
      }
    }

    if (winnerUser) {
      const probability = winnerUser.tickets / (total / 100);

      const m = await prepare(_.size(users) === 1 ? 'gambling.duel.noContestant' : 'gambling.duel.winner', {
        pointsName: await points.getPointsName(total),
        points: total,
        probability: _.round(probability, 2),
        ticketsName: await points.getPointsName(winnerUser.tickets),
        tickets: winnerUser.tickets,
        winner: winnerUser.username,
      });
      sendMessage(m, {
        username: oauth.botUsername,
        displayName: oauth.botUsername,
        userId: Number(oauth.botId),
        emotes: [],
        badges: {},
        'message-type': 'chat',
      }, { force: true });

      // give user his points
      await getRepository(User).increment({ userId: winnerUser.id }, 'points', total);

      // reset duel
      await getRepository(DuelEntity).clear();
      this._timestamp = 0;

      this.timeouts.pickDuelWinner = global.setTimeout(() => this.pickDuelWinner(), 30000);
    }
  }

  @command('!duel bank')
  async bank (opts) {
    const users = await getRepository(DuelEntity).find();
    const bank = users.map((o) => o.tickets).reduce((a, b) => a + b, 0);

    return [{
      response: prepare('gambling.duel.bank', {
        command: this.getCommand('!duel'),
        points: bank,
        pointsName: await points.getPointsName(bank),
      }),
      ...opts,
    }];
  }

  @command('!duel')
  async main (opts) {
    const responses: CommandResponse[] = [];
    let bet;

    opts.sender['message-type'] = 'chat'; // force responses to chat
    try {
      const parsed = opts.parameters.trim().match(/^([\d]+|all)$/);
      if (_.isNil(parsed)) {
        throw Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      const pointsOfUser = await points.getPointsOf(opts.sender.userId);
      bet = parsed[1] === 'all' ? pointsOfUser : parsed[1];

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
      const userFromDB = await getRepository(DuelEntity).findOne({ id: opts.sender.userId });
      const isNewDuelist = !userFromDB;
      if (userFromDB) {
        await getRepository(DuelEntity).save({...userFromDB, tickets: Number(userFromDB.tickets) + Number(bet) });
        await points.decrement({ userId: opts.sender.userId }, parseInt(bet, 10));
      } else {
        // check if under gambling cooldown
        const cooldown = this.cooldown;
        const isMod = isModerator(opts.sender);
        if (new Date().getTime() - new Date(this._cooldown).getTime() > cooldown * 1000
          || (this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
          // save new cooldown if not bypassed
          if (!(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
            this._cooldown = String(new Date());
          }
          await getRepository(DuelEntity).save({
            id: opts.sender.userId,
            username: opts.sender.username,
            tickets: Number(bet),
          });
          await points.decrement({ userId: opts.sender.userId }, parseInt(bet, 10));
        } else {
          const response = await prepare('gambling.fightme.cooldown', {
            minutesName: getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60), 'core.minutes'),
            cooldown: Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60),
            command: opts.command });
          return [{ response, ...opts }];
        }
      }

      // if new duel, we want to save timestamp
      const isNewDuel = (this._timestamp) === 0;
      if (isNewDuel) {
        this._timestamp = Number(new Date());
        const response = await prepare('gambling.duel.new', {
          minutesName: getLocalizedName(5, 'core.minutes'),
          minutes: this.duration,
          command: opts.command });
        responses.push({ response, ...opts });
      }

      const tickets = (await getRepository(DuelEntity).findOne({ id: opts.sender.userId }))?.tickets ?? 0;
      const response = await prepare(isNewDuelist ? 'gambling.duel.joined' : 'gambling.duel.added', {
        pointsName: await points.getPointsName(tickets),
        points: tickets,
      });
      responses.push({ response, ...opts });
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          responses.push({ response: translate('gambling.duel.notEnoughOptions'), ...opts });
          break;
        case ERROR_ZERO_BET:
          responses.push({ response: await prepare('gambling.duel.zeroBet', {
            pointsName: await points.getPointsName(0),
          }), ...opts });
          break;
        case ERROR_NOT_ENOUGH_POINTS:
          responses.push({ response: await prepare('gambling.duel.notEnoughPoints', {
            pointsName: await points.getPointsName(bet),
            points: bet,
          }), ...opts });
          break;
        case ERROR_MINIMAL_BET:
          bet = this.minimalBet;
          responses.push({ response: await prepare('gambling.duel.lowerThanMinimalBet', {
            pointsName: await points.getPointsName(bet),
            points: bet,
            command: opts.command,
          }), ...opts });
          break;
        default:
          error(e.stack);
          responses.push({ response: translate('core.error'), ...opts });
      }
    }
    return responses;
  }
}

export default new Duel();
