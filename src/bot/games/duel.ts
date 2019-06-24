import _ from 'lodash';
import { isMainThread } from 'worker_threads';

import { getLocalizedName, getOwner, isBroadcaster, isModerator, prepare, sendMessage } from '../commons';
import { command, shared, settings } from '../decorators';
import Game from './_interface';

const ERROR_NOT_ENOUGH_OPTIONS = '0';
const ERROR_ZERO_BET = '1';
const ERROR_NOT_ENOUGH_POINTS = '2';
const ERROR_MINIMAL_BET = '3';

/*
 * !duel [points]   - start or participate in duel
 */

class Duel extends Game {
  dependsOn = [ 'systems.points' ];

  @shared()
  _timestamp: number = 0;
  @shared()
  _cooldown: string = String(new Date());

  @settings()
  cooldown: number = 0;
  @settings()
  duration: number = 5;
  @settings()
  minimalBet: number = 0;
  @settings()
  bypassCooldownByOwnerAndMods: boolean = false;

  constructor () {
    super();
    if (isMainThread) {this.pickDuelWinner();}
  }

  async pickDuelWinner () {
    clearTimeout(this.timeouts['pickDuelWinner']);

    const [users, timestamp, duelDuration] = await Promise.all([
      global.db.engine.find(this.collection.users),
      this._timestamp,
      this.duration
    ]);
    const total = users.reduce((total, v) => total + v.tickets, 0);

    if (timestamp === 0 || new Date().getTime() - timestamp < 1000 * 60 * duelDuration) {
      this.timeouts['pickDuelWinner'] = global.setTimeout(() => this.pickDuelWinner(), 30000);
      return;
    }

    if (total === 0 && new Date().getTime() - timestamp >= 1000 * 60 * duelDuration) {
      await global.db.engine.remove(this.collection.users, {});
      this._timestamp = 0;
      return;
    }

    let winner = _.random(0, total, false);
    let winnerUser;
    for (let user of users) {
      winner = winner - user.tickets;
      if (winner <= 0) { // winner tickets are <= 0 , we have winner
        winnerUser = user;
        break;
      }
    }

    const probability = winnerUser.tickets / (total / 100);

    let m = await prepare(_.size(users) === 1 ? 'gambling.duel.noContestant' : 'gambling.duel.winner', {
      pointsName: await global.systems.points.getPointsName(total),
      points: total,
      probability: _.round(probability, 2),
      ticketsName: await global.systems.points.getPointsName(winnerUser.tickets),
      tickets: winnerUser.tickets,
      winner: winnerUser.username
    });
    const userObj = await global.users.getByName(getOwner());
    sendMessage(m, {
      username: userObj.username,
      displayName: userObj.displayName || userObj.username,
      userId: userObj.id,
      emotes: [],
      badges: {},
      'message-type': 'chat'
    }, { force: true });

    // give user his points
    await global.db.engine.increment('users.points', { id: winnerUser.id }, { points: parseInt(total, 10) });

    // reset duel
    await global.db.engine.remove(this.collection.users, {});
    this._timestamp = 0;

    this.timeouts['pickDuelWinner'] = global.setTimeout(() => this.pickDuelWinner(), 30000);
  }

  @command('!duel bank')
  async bank (opts) {
    const users = await global.db.engine.find(this.collection.users);
    const bank = users.map((o) => o.tickets).reduce((a, b) => a + b, 0);

    sendMessage(
      prepare('gambling.duel.bank', {
        command: this.getCommand('!duel'),
        points: bank,
        pointsName: await global.systems.points.getPointsName(bank),
      }), opts.sender);
  }

  @command('!duel')
  async main (opts) {
    let message, bet;

    opts.sender['message-type'] = 'chat'; // force responses to chat
    try {
      let parsed = opts.parameters.trim().match(/^([\d]+|all)$/);
      if (_.isNil(parsed)) {throw Error(ERROR_NOT_ENOUGH_OPTIONS);}

      const points = await global.systems.points.getPointsOf(opts.sender.userId);
      bet = parsed[1] === 'all' ? points : parsed[1];

      if (points === 0) {throw Error(ERROR_ZERO_BET);}
      if (points < bet) {throw Error(ERROR_NOT_ENOUGH_POINTS);}
      if (bet < (this.minimalBet)) {throw Error(ERROR_MINIMAL_BET);}

      // check if user is already in duel and add points
      let userFromDB = await global.db.engine.findOne(this.collection.users, { id: opts.sender.userId });
      const isNewDuelist = _.isEmpty(userFromDB);
      if (!isNewDuelist) {
        await global.db.engine.update(this.collection.users, { _id: String(userFromDB._id) }, { tickets: Number(userFromDB.tickets) + Number(bet) });
        await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: parseInt(bet, 10) * -1 });
      } else {
        // check if under gambling cooldown
        const cooldown = this.cooldown;
        const isMod = await isModerator(opts.sender);
        if (new Date().getTime() - new Date(this._cooldown).getTime() > cooldown * 1000 ||
          (this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
          // save new cooldown if not bypassed
          if (!(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {this._cooldown = String(new Date());}
          await global.db.engine.insert(this.collection.users, { id: opts.sender.userId, username: opts.sender.username, tickets: Number(bet) });
          await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: parseInt(bet, 10) * -1 });
        } else {
          message = await prepare('gambling.fightme.cooldown', {
            minutesName: getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60), 'core.minutes'),
            cooldown: Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60),
            command: opts.command });
          sendMessage(message, opts.sender, opts.attr);
          return true;
        }
      }

      // if new duel, we want to save timestamp
      const isNewDuel = (this._timestamp) === 0;
      if (isNewDuel) {
        this._timestamp = Number(new Date());
        message = await prepare('gambling.duel.new', {
          minutesName: getLocalizedName(5, 'core.minutes'),
          minutes: this.duration,
          command: opts.command });
        sendMessage(message, opts.sender, opts.attr);
      }

      const tickets = (await global.db.engine.findOne(this.collection.users, { id: opts.sender.userId })).tickets;
      global.setTimeout(async () => {
        message = await prepare(isNewDuelist ? 'gambling.duel.joined' : 'gambling.duel.added', {
          pointsName: await global.systems.points.getPointsName(tickets),
          points: tickets
        });
        sendMessage(message, opts.sender, opts.attr);
      }, isNewDuel ? 500 : 0);
      return true;
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          sendMessage(global.translate('gambling.duel.notEnoughOptions'), opts.sender, opts.attr);
          break;
        case ERROR_ZERO_BET:
          message = await prepare('gambling.duel.zeroBet', {
            pointsName: await global.systems.points.getPointsName(0)
          });
          sendMessage(message, opts.sender, opts.attr);
          break;
        case ERROR_NOT_ENOUGH_POINTS:
          message = await prepare('gambling.duel.notEnoughPoints', {
            pointsName: await global.systems.points.getPointsName(bet),
            points: bet
          });
          sendMessage(message, opts.sender, opts.attr);
          break;
        case ERROR_MINIMAL_BET:
          bet = this.minimalBet;
          message = await prepare('gambling.duel.lowerThanMinimalBet', {
            pointsName: await global.systems.points.getPointsName(bet),
            points: bet,
            command: opts.command
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

export default Duel;
export { Duel };