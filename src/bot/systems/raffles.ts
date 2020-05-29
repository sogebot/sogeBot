'use strict';

import * as _ from 'lodash';
import { isMainThread } from '../cluster';

import { announce, getOwnerAsSender, prepare } from '../commons';
import { command, default_permission, parser, settings } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import { Raffle, RaffleParticipant, RaffleParticipantInterface, RaffleParticipantMessageInterface } from '../database/entity/raffle';
import { debug, warning } from '../helpers/log';
import api from '../api';
import points from './points';
import { isDbConnected } from '../helpers/database';

const TYPE_NORMAL = 0;
const TYPE_TICKETS = 1;

/*
 * !raffle                               - gets an info about raffle
 * !raffle open ![raffle-keyword] [-min #?] [-max #?] [-for followers,subscribers?]
 *                                       - open a new raffle with selected keyword,
 *                                       - -min # - minimal of tickets to join, -max # - max of tickets to join -> ticket raffle
 *                                       - -for followers,subscribers - who can join raffle, if empty -> everyone
 * !raffle remove                        - remove raffle without winner
 * !raffle pick                          - pick or repick a winner of raffle
 * ![raffle-keyword]                     - join a raffle
 */

class Raffles extends System {
  lastAnnounce: number = _.now();

  @settings('luck')
  subscribersPercent = 150;
  @settings('luck')
  followersPercent = 120;

  @settings()
  raffleAnnounceInterval = 10;
  @settings()
  allowOverTicketing = false;

  constructor () {
    super();
    this.addWidget('raffles', 'widget-title-raffles', 'fas fa-gift');

    if (isMainThread) {
      this.announce();
    }
  }

  sockets () {
    adminEndpoint(this.nsp, 'raffle::getWinner', async (username: string, cb) => {
      try {
        cb(
          null,
          await getRepository(User).findOne({username}),
        );
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'raffle::updateParticipant', async (participant, cb) => {
      try {
        cb(
          null,
          await getRepository(RaffleParticipant).save(participant),
        );
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'raffle:getLatest', async (cb) => {
      try {
        cb(
          null,
          await getRepository(Raffle).findOne({
            relations: ['participants', 'participants.messages'],
            order: {
              timestamp: 'DESC',
            },
          }),
        );
      } catch (e) {
        cb (e);
      }
    });
    adminEndpoint(this.nsp, 'raffle::pick', async () => {
      this.pick({ attr: {}, command: '!raffle', createdAt: Date.now(), parameters: '', sender: getOwnerAsSender() });
    });
    adminEndpoint(this.nsp, 'raffle::open', async (message) => {
      // force close raffles
      await getRepository(Raffle).update({}, { isClosed: true });
      this.open({ attr: {}, command: '!raffle open', createdAt: Date.now(), sender: getOwnerAsSender(), parameters: message });
    });
    adminEndpoint(this.nsp, 'raffle::close', async () => {
      await getRepository(Raffle).update({ isClosed: false }, { isClosed: true });
    });
  }

  @parser({ fireAndForget: true })
  async messages (opts: ParserOptions) {
    if (opts.skip) {
      return true;
    }

    const raffle = await getRepository(Raffle).findOne({
      where: {
        isClosed: true,
      },
      order: {
        timestamp: 'DESC',
      },
    });
    if (!raffle) {
      return true;
    }

    const isWinner = !_.isNil(raffle.winner) && raffle.winner === opts.sender.username;
    const isInFiveMinutesTreshold = _.now() - raffle.timestamp <= 1000 * 60 * 5;

    if (isWinner && isInFiveMinutesTreshold) {
      const winner = await getRepository(RaffleParticipant).findOne({
        relations: ['messages'],
        where: {
          username: opts.sender.username,
          raffle,
        },
      });
      if (winner) {
        const message: RaffleParticipantMessageInterface = {
          timestamp: Date.now(),
          text: opts.message,
        };
        winner.messages.push(message);
        await getRepository(RaffleParticipant).save(winner);
      }
    }
    return true;
  }

  async announce () {
    clearTimeout(this.timeouts.raffleAnnounce);
    if (!isDbConnected) {
      this.timeouts.raffleAnnounce = global.setTimeout(() => this.announce(), 1000);
      return;
    }

    const raffle = await getRepository(Raffle).findOne({ winner: null, isClosed: false });
    if (!(api.isStreamOnline) || !raffle || new Date().getTime() - new Date(this.lastAnnounce).getTime() < (this.raffleAnnounceInterval * 60 * 1000)) {
      this.timeouts.raffleAnnounce = global.setTimeout(() => this.announce(), 60000);
      return;
    }

    this.lastAnnounce = _.now();

    let locale = 'raffles.announce-raffle';
    if (raffle.type === TYPE_TICKETS) {
      locale = 'raffles.announce-ticket-raffle';
    }

    const eligibility: string[] = [];
    if (raffle.forFollowers === true) {
      eligibility.push(prepare('raffles.eligibility-followers-item'));
    }
    if (raffle.forSubscribers === true) {
      eligibility.push(prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(prepare('raffles.eligibility-everyone-item'));
    }

    const message = prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.minTickets,
      max: raffle.maxTickets,
      eligibility: eligibility.join(', '),
    });
    announce(message);
    this.timeouts.raffleAnnounce = global.setTimeout(() => this.announce(), 60000);
  }

  @command('!raffle remove')
  @default_permission(permission.CASTERS)
  async remove (opts: CommandOptions): Promise<CommandResponse[]> {
    const raffle = await getRepository(Raffle).findOne({ winner: null, isClosed: false });
    if (raffle) {
      await getRepository(Raffle).remove(raffle);
    }
    return [];
  }

  @command('!raffle open')
  @default_permission(permission.CASTERS)
  async open (opts: CommandOptions): Promise<CommandResponse[]> {
    const [followers, subscribers] = [opts.parameters.indexOf('followers') >= 0, opts.parameters.indexOf('subscribers') >= 0];
    let type = (opts.parameters.indexOf('-min') >= 0 || opts.parameters.indexOf('-max') >= 0) ? TYPE_TICKETS : TYPE_NORMAL;
    if (!points.enabled) {
      type = TYPE_NORMAL;
    } // force normal type if points are disabled

    let minTickets = 1;
    let maxTickets = 100;

    if (type === TYPE_TICKETS) {
      const matchMin = opts.parameters.match(/-min (\d+)/);
      if (!_.isNil(matchMin)) {
        minTickets = Math.max(Number(matchMin[1]), minTickets);
      }

      const matchMax = opts.parameters.match(/-max (\d+)/);
      if (!_.isNil(matchMax)) {
        maxTickets = Number(matchMax[1]);
      }
    }

    const keywordMatch = opts.parameters.match(/(![\S]+)/);
    if (_.isNil(keywordMatch)) {
      const response = prepare('raffles.cannot-create-raffle-without-keyword');
      return [{ response, ...opts }];
    }
    const keyword = keywordMatch[1];

    // check if raffle running
    const raffle = await getRepository(Raffle).findOne({ winner: null, isClosed: false });
    if (raffle) {
      const response = prepare('raffles.raffle-is-already-running', { keyword: raffle.keyword });
      return [{ response, ...opts }];
    }

    await getRepository(Raffle).save({
      keyword: keyword,
      forFollowers: followers,
      forSubscribers: subscribers,
      minTickets,
      maxTickets,
      type: type,
      winner: null,
      isClosed: false,
      timestamp: Date.now(),
    });

    const eligibility: string[] = [];
    if (followers) {
      eligibility.push(prepare('raffles.eligibility-followers-item'));
    }
    if (subscribers) {
      eligibility.push(prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(prepare('raffles.eligibility-everyone-item'));
    }

    const response = prepare(type === TYPE_NORMAL ? 'raffles.announce-raffle' : 'raffles.announce-ticket-raffle', {
      keyword: keyword,
      eligibility: eligibility.join(', '),
      min: minTickets,
      max: maxTickets,
    });

    this.lastAnnounce = _.now();
    announce(response); // we are announcing raffle so it is send to all relevant channels
    return [];
  }

  @command('!raffle')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    const raffle = await getRepository(Raffle).findOne({ winner: null, isClosed: false });

    if (!raffle) {
      const response = prepare('raffles.no-raffle-is-currently-running');
      return [{ response, ...opts }];
    }

    let locale = 'raffles.announce-raffle';
    if (raffle.type === TYPE_TICKETS) {
      locale = 'raffles.announce-ticket-raffle';
    }

    const eligibility: string[] = [];
    if (raffle.forFollowers === true) {
      eligibility.push(prepare('raffles.eligibility-followers-item'));
    }
    if (raffle.forSubscribers === true) {
      eligibility.push(prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(prepare('raffles.eligibility-everyone-item'));
    }

    const response = prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.minTickets,
      max: raffle.maxTickets,
      eligibility: eligibility.join(', '),
    });
    return [{ response, ...opts }];
  }

  @parser()
  async participate (opts: ParserOptions): Promise<boolean> {
    if (_.isNil(opts.sender) || _.isNil(opts.sender.username) || !opts.message.match(/^(![\S]+)/)) {
      return true;
    }

    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: null, isClosed: false },
    });

    if (!raffle) {
      return true;
    }

    const user = await getRepository(User).findOne({ userId: opts.sender.userId });
    if (!user) {
      await getRepository(User).save({
        userId: Number(opts.sender.userId),
        username: opts.sender.username,
      });
      return this.participate(opts);
    }

    const isStartingWithRaffleKeyword = opts.message.toLowerCase().startsWith(raffle.keyword.toLowerCase());
    if (!isStartingWithRaffleKeyword) {
      return true;
    }

    opts.message = opts.message.toString().replace(raffle.keyword, '');
    let tickets = opts.message.trim() === 'all' && !_.isNil(await points.getPointsOf(opts.sender.userId)) ? await points.getPointsOf(opts.sender.userId) : parseInt(opts.message.trim(), 10);

    if ((!_.isFinite(tickets) || tickets <= 0 || tickets < raffle.minTickets) && raffle.type === TYPE_TICKETS) {
      return false;
    }
    if (tickets > raffle.maxTickets && raffle.type === TYPE_TICKETS) {
      tickets = raffle.maxTickets;
    }
    if (!_.isFinite(tickets)) {
      tickets = 0;
    }

    const participant = raffle.participants.find(o => o.username === opts.sender.username);
    let curTickets = 0;
    if (participant) {
      curTickets = participant.tickets;
    }
    let newTickets = curTickets + tickets;

    if (newTickets > raffle.maxTickets) {
      newTickets = raffle.maxTickets;
    }

    const userPoints = await points.getPointsOf(opts.sender.userId);
    if (raffle.type === TYPE_TICKETS && userPoints < tickets) {
      if (this.allowOverTicketing) {
        newTickets = curTickets + userPoints;
      } else {
        return false;
      }
    } // user doesn't have enough points

    const selectedParticipant = {
      ...participant,
      raffle,
      isEligible: participant?.isEligible ?? true,
      username: opts.sender.username,
      tickets: raffle.type === TYPE_NORMAL ? 1 : newTickets,
      messages: [],
      isFollower: user.isFollower,
      isSubscriber: user.isSubscriber,
    };

    if (raffle.forFollowers && raffle.forSubscribers && selectedParticipant.isEligible) {
      selectedParticipant.isEligible = user.isFollower || user.isSubscriber;
    } else if (raffle.forFollowers && selectedParticipant.isEligible) {
      selectedParticipant.isEligible = user.isFollower;
    } else if (raffle.forSubscribers && selectedParticipant.isEligible) {
      selectedParticipant.isEligible = user.isSubscriber;
    }

    if (selectedParticipant.isEligible) {
      if (raffle.type === TYPE_TICKETS) {
        await points.decrement({ userId: opts.sender.userId }, newTickets - curTickets);
      }
      debug('raffle', '------------------------------------------------------------------------------------------------');
      debug('raffle', `Eligible user ${opts.sender.username}#${opts.sender.userId} for raffle ${raffle.id}`);
      debug('raffle', opts.sender);
      debug('raffle', selectedParticipant);
      debug('raffle', user);
      debug('raffle', '------------------------------------------------------------------------------------------------');
      await getRepository(RaffleParticipant).save(selectedParticipant);
      return true;
    } else {
      return false;
    }
  }

  @command('!raffle pick')
  @default_permission(permission.CASTERS)
  async pick (opts: CommandOptions): Promise<CommandResponse[]> {
    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      order: {
        timestamp: 'DESC',
      },
    });
    if (!raffle) {
      return [];
    } // no raffle ever

    if (raffle.participants.length === 0) {
      const response = prepare('raffles.no-participants-to-pick-winner');
      // close raffle on pick
      await getRepository(Raffle).save({...raffle, isClosed: true, timestamp: Date.now()});
      return [{ response, ...opts }];
    }

    let _total = 0;
    const [fLuck, sLuck] = await Promise.all([this.followersPercent, this.subscribersPercent]);
    for (const participant of _.filter(raffle.participants, (o) => o.isEligible)) {
      if (participant.isFollower || participant.isSubscriber) {
        if (participant.isSubscriber) {
          _total = _total + ((participant.tickets / 100) * sLuck);
        } else if (participant.isFollower) {
          _total = _total + ((participant.tickets / 100) * fLuck);
        }
      } else {
        _total = _total + participant.tickets;
      }
    }

    let winNumber = _.random(0, _total - 1, false);
    let winner: Readonly<RaffleParticipantInterface> | null = null;
    for (const participant of _.filter(raffle.participants, (o) => o.isEligible)) {
      let tickets = participant.tickets;

      if (participant.isSubscriber) {
        tickets = ((participant.tickets / 100) * sLuck);
      } else if (participant.isFollower) {
        tickets = ((participant.tickets / 100) * fLuck);
      }

      winNumber = winNumber - tickets;
      winner = participant;
      if (winNumber <= 0) {
        break;
      }
    }

    let tickets = 0;
    if (winner) {
      tickets = winner.tickets;
      if (winner.isSubscriber) {
        tickets = ((winner.tickets / 100) * sLuck);
      } else if (winner.isFollower) {
        tickets = ((winner.tickets / 100) * fLuck);
      }
    }

    const probability = (tickets / _total * 100);

    // uneligible winner (don't want to pick second time same user if repick)
    if (winner) {
      await Promise.all([
        getRepository(RaffleParticipant).save({...winner, isEligible: false }),
        getRepository(Raffle).save({...raffle, winner: winner.username, isClosed: true, timestamp: Date.now()}),
      ]);

      const response = prepare('raffles.raffle-winner-is', {
        username: winner.username,
        keyword: raffle.keyword,
        probability: _.round(probability, 2),
      });
      announce(response);
    } else {
      // close raffle on pick
      await getRepository(Raffle).save({...raffle, isClosed: true, timestamp: Date.now()}),
      warning('No winner found in raffle');
    }
    return [];
  }
}

export default new Raffles();
