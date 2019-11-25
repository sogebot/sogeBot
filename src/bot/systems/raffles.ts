'use strict';

import * as _ from 'lodash';
import { isMainThread } from '../cluster';

import { getOwner, prepare, sendMessage } from '../commons';
import { command, default_permission, parser, settings } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import { Raffle, RaffleParticipant, RaffleParticipantMessage } from '../database/entity/raffle';
import { warning } from '../helpers/log';
import api from '../api';
import oauth from '../oauth';
import points from './points';

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

  constructor () {
    super();
    this.addWidget('raffles', 'widget-title-raffles', 'fas fa-gift');

    if (isMainThread) {
      this.announce();
    }
  }

  sockets () {
    adminEndpoint(this.nsp, 'raffle::getWinner', async (username: string, cb) => {
      cb(
        await getRepository(User).findOne({username}),
      );
    });
    adminEndpoint(this.nsp, 'raffle::updateParticipant', async (participant: RaffleParticipant, cb) => {
      cb(
        await getRepository(RaffleParticipant).save(participant),
      );
    });
    adminEndpoint(this.nsp, 'raffle:getLatest', async (cb) => {
      cb(
        await getRepository(Raffle).findOne({
          relations: ['participants', 'participants.messages'],
          order: {
            timestamp: 'DESC',
          },
        }),
      );
    });
    adminEndpoint(this.nsp, 'raffle::pick', async (cb) => {
      this.pick();
    });
    adminEndpoint(this.nsp, 'raffle::open', async (message) => {
      this.open({ username: getOwner(), parameters: message });
    });
    adminEndpoint(this.nsp, 'raffle::close', async () => {
      await getRepository(Raffle).update({ isClosed: false }, { isClosed: true });
    });
  }

  @parser({ fireAndForget: true })
  async messages (opts) {
    if (opts.skip) {
      return true;
    }

    const raffle = await getRepository(Raffle).findOne({
      where: {
        isClosed: false,
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
        const message = new RaffleParticipantMessage();
        message.timestamp = Date.now();
        message.text = opts.message;
        winner.messages.push(message);
        await getRepository(RaffleParticipant).save(winner);
      };
    }
    return true;
  }

  async announce () {
    clearTimeout(this.timeouts.raffleAnnounce);
    const raffle = await getRepository(Raffle).findOne({ winner: null });
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
      eligibility.push(await prepare('raffles.eligibility-followers-item'));
    }
    if (raffle.forSubscribers === true) {
      eligibility.push(await prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(await prepare('raffles.eligibility-everyone-item'));
    }

    const message = await prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.minTickets,
      max: raffle.maxTickets,
      eligibility: eligibility.join(', '),
    });
    sendMessage(message, {
      username: oauth.botUsername,
      displayName: oauth.botUsername,
      userId: Number(oauth.botId),
      emotes: [],
      badges: {},
      'message-type': 'chat',
    });

    this.timeouts.raffleAnnounce = global.setTimeout(() => this.announce(), 60000);
  }

  @command('!raffle remove')
  @default_permission(permission.CASTERS)
  async remove (self) {
    const raffle = await getRepository(Raffle).findOne({ winner: null, isClosed: false });
    if (!raffle) {
      return;
    }
    await getRepository(Raffle).remove(raffle);

    self.refresh();
  }

  @command('!raffle open')
  @default_permission(permission.CASTERS)
  async open (opts) {
    const [followers, subscribers] = [opts.parameters.indexOf('followers') >= 0, opts.parameters.indexOf('subscribers') >= 0];
    let type = (opts.parameters.indexOf('-min') >= 0 || opts.parameters.indexOf('-max') >= 0) ? TYPE_TICKETS : TYPE_NORMAL;
    if (!points.enabled) {
      type = TYPE_NORMAL;
    } // force normal type if points are disabled

    let minTickets = 0;
    let maxTickets = 100;

    if (type === TYPE_TICKETS) {
      let match;
      match = opts.parameters.match(/-min (\d+)/);
      if (!_.isNil(match)) {
        minTickets = match[1];
      }

      match = opts.parameters.match(/-max (\d+)/);
      if (!_.isNil(match)) {
        maxTickets = match[1];
      }
    }

    let keyword = opts.parameters.match(/(![\S]+)/);
    if (_.isNil(keyword)) {
      const message = await prepare('raffles.cannot-create-raffle-without-keyword');
      sendMessage(message, opts.sender, opts.attr);
      return;
    }
    keyword = keyword[1];

    // check if raffle running
    const raffle = await getRepository(Raffle).findOne({ winner: null, isClosed: false });
    if (raffle) {
      const message = await prepare('raffles.raffle-is-already-running', { keyword: raffle.keyword });
      sendMessage(message, opts.sender, opts.attr);
      return;
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
      eligibility.push(await prepare('raffles.eligibility-followers-item'));
    }
    if (subscribers) {
      eligibility.push(await prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(await prepare('raffles.eligibility-everyone-item'));
    }

    const message = await prepare(type === TYPE_NORMAL ? 'raffles.announce-raffle' : 'raffles.announce-ticket-raffle', {
      keyword: keyword,
      eligibility: eligibility.join(', '),
      min: minTickets,
      max: maxTickets,
    });
    sendMessage(message, {
      username: oauth.botUsername,
      displayName: oauth.botUsername,
      userId: Number(oauth.botId),
      emotes: [],
      badges: {},
      'message-type': 'chat',
    });

    this.lastAnnounce = _.now();
  }

  @command('!raffle')
  async main (opts) {
    const raffle = await getRepository(Raffle).findOne({ winner: null, isClosed: false });

    if (!raffle) {
      const message = await prepare('raffles.no-raffle-is-currently-running');
      sendMessage(message, opts.sender, opts.attr);
      return;
    }

    let locale = 'raffles.announce-raffle';
    if (raffle.type === TYPE_TICKETS) {
      locale = 'raffles.announce-ticket-raffle';
    }

    const eligibility: string[] = [];
    if (raffle.forFollowers === true) {
      eligibility.push(await prepare('raffles.eligibility-followers-item'));
    }
    if (raffle.forSubscribers === true) {
      eligibility.push(await prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(await prepare('raffles.eligibility-everyone-item'));
    }

    const message = await prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.minTickets,
      max: raffle.maxTickets,
      eligibility: eligibility.join(', '),
    });
    sendMessage(message, {
      username: oauth.botUsername,
      displayName: oauth.botUsername,
      userId: Number(oauth.botId),
      emotes: [],
      badges: {},
      'message-type': 'chat',
    });
  }

  @parser()
  async participate (opts) {
    if (_.isNil(opts.sender) || _.isNil(opts.sender.username) || !opts.message.match(/^(![\S]+)/)) {
      return true;
    }

    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: null, isClosed: false },
    });
    let user = await getRepository(User).findOne({ userId: opts.sender.userId });
    if (!user) {
      user = new User();
      user.userId = Number(opts.sender.userId);
      user.username = opts.sender.username;
      await getRepository(User).save(user);
    }

    if (!raffle) {
      return true;
    }

    const isStartingWithRaffleKeyword = opts.message.toLowerCase().startsWith(raffle.keyword.toLowerCase());
    if (!isStartingWithRaffleKeyword) {
      return true;
    }

    opts.message = opts.message.toString().replace(raffle.keyword, '');
    let tickets = opts.message.trim() === 'all' && !_.isNil(await points.getPointsOf(opts.sender.userId)) ? await points.getPointsOf(opts.sender.userId) : parseInt(opts.message.trim(), 10);

    if ((!_.isFinite(tickets) || tickets <= 0 || tickets > raffle.maxTickets || tickets < raffle.minTickets) && raffle.type === TYPE_TICKETS) {
      return false;
    }
    if (!_.isFinite(tickets)) {
      tickets = 0;
    }

    let participant = raffle.participants.find(o => o.username === opts.sender.username);
    let curTickets = 0;
    if (participant) {
      curTickets = participant.tickets;
    }
    let newTickets = curTickets + tickets;

    if (newTickets > raffle.maxTickets) {
      newTickets = raffle.maxTickets;
    }
    tickets = newTickets - curTickets;

    if (!participant) {
      participant = new RaffleParticipant();
      participant.raffle = raffle;
      participant.isEligible = true;
      participant.username = opts.sender.username;
    }
    participant.tickets = raffle.type === TYPE_NORMAL ? 1 : newTickets;
    participant.messages = [];
    participant.isFollower = user.isFollower;
    participant.isSubscriber = user.isSubscriber;

    if (raffle.type === TYPE_TICKETS && await points.getPointsOf(opts.sender.userId) < tickets) {
      return false;
    } // user doesn't have enough points

    if (raffle.forFollowers && raffle.forSubscribers && participant.isEligible) {
      participant.isEligible = user.isFollower || user.isSubscriber;
    } else if (raffle.forFollowers && participant.isEligible) {
      participant.isEligible = user.isFollower;
    } else if (raffle.forSubscribers && participant.isEligible) {
      participant.isEligible = user.isSubscriber;
    }

    if (participant.isEligible) {
      if (raffle.type === TYPE_TICKETS) {
        await getRepository(User).decrement({ userId: opts.sender.userId }, 'points', tickets);
      }
      await getRepository(RaffleParticipant).save(participant);
    }
    return true;
  }

  @command('!raffle pick')
  @default_permission(permission.CASTERS)
  async pick () {
    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      order: {
        timestamp: 'DESC',
      },
    });
    if (!raffle) {
      return true;
    } // no raffle ever

    if (raffle.participants.length === 0) {
      const message = await prepare('raffles.no-participants-to-pick-winner');
      sendMessage(message, {
        username: oauth.botUsername,
        displayName: oauth.botUsername,
        userId: Number(oauth.botId),
        emotes: [],
        badges: {},
        'message-type': 'chat',
      });

      // close raffle on pick
      raffle.isClosed = true;
      raffle.timestamp = Date.now();
      await Promise.all([
        getRepository(Raffle).save(raffle),
      ]);
      return true;
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
    let winner: RaffleParticipant | null = null;
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
      winner.isEligible = false;
      raffle.winner = winner.username;
      raffle.isClosed = true;
      raffle.timestamp = Date.now();
      await Promise.all([
        getRepository(RaffleParticipant).save(winner),
        getRepository(Raffle).save(raffle),
      ]);

      const message = await prepare('raffles.raffle-winner-is', {
        username: winner.username,
        keyword: raffle.keyword,
        probability: _.round(probability, 2),
      });
      sendMessage(message, {
        username: oauth.botUsername,
        displayName: oauth.botUsername,
        userId: Number(oauth.botId),
        emotes: [],
        badges: {},
        'message-type': 'chat',
      });
    } else {
      // close raffle on pick
      raffle.isClosed = true;
      raffle.timestamp = Date.now();
      await Promise.all([
        getRepository(Raffle).save(raffle),
      ]);
      warning('No winner found in raffle');
    }
  }
}

export default new Raffles();
