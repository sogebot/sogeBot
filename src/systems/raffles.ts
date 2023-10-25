import {
  Raffle, RaffleParticipant, RaffleParticipantInterface, RaffleParticipantMessageInterface,
} from '@entity/raffle.js';
import { User } from '@entity/user.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import * as _ from 'lodash-es';
import { IsNull } from 'typeorm';

import System from './_interface.js';
import { onStartup } from '../decorators/on.js';
import {
  command, default_permission, parser, settings, timer,
} from '../decorators.js';

import { AppDataSource } from '~/database.js';
import { isStreamOnline } from '~/helpers/api/index.js';
import {
  announce, getOwnerAsSender, prepare,
} from '~/helpers/commons/index.js';
import { isDbConnected } from '~/helpers/database.js';
import { debug, warning } from '~/helpers/log.js';
import { linesParsed } from '~/helpers/parser.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { adminEndpoint } from '~/helpers/socket.js';
import { tmiEmitter } from '~/helpers/tmi/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import points from '~/systems/points.js';
import { translate } from '~/translate.js';

const TYPE_NORMAL = 0;
const TYPE_TICKETS = 1;

/*
 * !raffle                               - gets an info about raffle
 * !raffle open ![raffle-keyword] [-min #?] [-max #?] [-for subscribers?]
 *                                       - open a new raffle with selected keyword,
 *                                       - -min # - minimal of tickets to join, -max # - max of tickets to join -> ticket raffle
 *                                       - -for subscribers - who can join raffle, if empty -> everyone
 * !raffle remove                        - remove raffle without winner
 * !raffle pick                          - pick or repick a winner of raffle
 * ![raffle-keyword]                     - join a raffle
 */

let announceNewEntriesTime = 0;
let announceNewEntriesCount = 0;

class Raffles extends System {
  lastAnnounce = Date.now();
  lastAnnounceMessageCount = 0;

  @settings('luck')
    subscribersPercent = 150;

  @settings()
    raffleAnnounceInterval = 10;
  @settings()
    raffleAnnounceMessageInterval = 20;
  @settings()
    allowOverTicketing = false;

  @settings('join')
    deleteRaffleJoinCommands = false;
  @settings('join')
    announceNewEntries = true;
  @settings('join')
    announceNewEntriesBatchTime = 15;

  @onStartup()
  onStartup() {
    this.announce();
    setInterval(() => {
      if (this.announceNewEntries && announceNewEntriesTime !== 0 && announceNewEntriesTime <= Date.now()) {
        this.announceEntries();
      }
    }, 1000);
  }

  sockets () {
    adminEndpoint('/systems/raffles', 'raffle::getWinner', async (userName: string, cb) => {
      try {
        await changelog.flush();
        cb(
          null,
          await AppDataSource.getRepository(User).findOneBy({ userName }) as any,
        );
      } catch (e: any) {
        cb(e.stack);
      }
    });
    adminEndpoint('/systems/raffles', 'raffle::setEligibility', async ({ id, isEligible }, cb) => {
      try {
        await AppDataSource.getRepository(RaffleParticipant).update({ id }, { isEligible });
        cb(null);
      } catch (e: any) {
        cb(e.stack);
      }
    });
    adminEndpoint('/systems/raffles', 'raffle:getLatest', async (cb) => {
      try {
        cb(
          null,
          (await AppDataSource.getRepository(Raffle).find({
            relations: ['participants', 'participants.messages'],
            order:     { timestamp: 'DESC' },
            take:      1,
          }))[0],
        );
      } catch (e: any) {
        cb (e);
      }
    });
    adminEndpoint('/systems/raffles', 'raffle::pick', async () => {
      this.pick({
        attr: {}, command: '!raffle', createdAt: Date.now(), parameters: '', sender: getOwnerAsSender(), isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
      });
    });
    adminEndpoint('/systems/raffles', 'raffle::open', async (message) => {
      // force close raffles
      await AppDataSource.getRepository(Raffle).update({}, { isClosed: true });
      this.open({
        attr: {}, command: '!raffle open', createdAt: Date.now(), sender: getOwnerAsSender(), parameters: message, isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
      });
    });
    adminEndpoint('/systems/raffles', 'raffle::close', async () => {
      await AppDataSource.getRepository(Raffle).update({ isClosed: false }, { isClosed: true });
    });
  }

  @parser({ fireAndForget: true })
  async messages (opts: ParserOptions) {
    if (opts.skip || !opts.sender) {
      return true;
    }

    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      where: { isClosed: true },
      order: { timestamp: 'DESC' },
    });
    if (!raffle) {
      return true;
    }

    const isWinner = !_.isNil(raffle.winner) && raffle.winner === opts.sender.userName;
    const isInFiveMinutesTreshold = Date.now() - raffle.timestamp <= 1000 * 60 * 5;

    if (isWinner && isInFiveMinutesTreshold) {
      const winner = await AppDataSource.getRepository(RaffleParticipant).findOne({
        relations: ['messages'],
        where:     {
          username: opts.sender.userName,
          raffle:   {
            id: raffle.id,
          },
        },
      });
      if (winner) {
        const message: RaffleParticipantMessageInterface = {
          timestamp: Date.now(),
          text:      opts.message,
        };
        winner.messages.push(message);
        await AppDataSource.getRepository(RaffleParticipant).save(winner);
      }
    }
    return true;
  }

  async announceEntries() {
    try {
      const raffle = await AppDataSource.getRepository(Raffle).findOneOrFail({ where: { winner: IsNull(), isClosed: false }, relations: ['participants'] });
      const eligibility: string[] = [];
      if (raffle.forSubscribers === true) {
        eligibility.push(prepare('raffles.eligibility-subscribers-item'));
      }
      if (_.isEmpty(eligibility)) {
        eligibility.push(prepare('raffles.eligibility-everyone-item'));
      }

      const message = prepare(raffle.type === TYPE_NORMAL ? 'raffles.added-entries' : 'raffles.added-ticket-entries', {
        l10n_entries: getLocalizedName(announceNewEntriesCount, translate('core.entries')),
        count:        announceNewEntriesCount,
        countTotal:   raffle.participants.reduce((a, b) => {
          a += b.tickets;
          return a;
        }, 0),
        keyword:     raffle.keyword,
        min:         raffle.minTickets,
        max:         raffle.maxTickets,
        eligibility: eligibility.join(', '),
      });

      announce(message, 'raffles');
    } catch (e: any) {
      warning('No active raffle found to announce added entries.');
    }
    announceNewEntriesTime = 0;
    announceNewEntriesCount = 0;
  }

  async announce () {
    clearTimeout(this.timeouts.raffleAnnounce);
    if (!isDbConnected) {
      this.timeouts.raffleAnnounce = global.setTimeout(() => this.announce(), 1000);
      return;
    }

    const raffle = await AppDataSource.getRepository(Raffle).findOne({ where: { winner: IsNull(), isClosed: false }, relations: ['participants'] });
    const isTimeToAnnounce = new Date().getTime() - new Date(this.lastAnnounce).getTime() >= (this.raffleAnnounceInterval * 60 * 1000);
    const isMessageCountToAnnounce = linesParsed - this.lastAnnounceMessageCount >= this.raffleAnnounceMessageInterval;
    if (!(isStreamOnline.value) || !raffle || !isTimeToAnnounce || !isMessageCountToAnnounce) {
      this.timeouts.raffleAnnounce = global.setTimeout(() => this.announce(), 60000);
      return;
    }
    this.lastAnnounce = Date.now();
    this.lastAnnounceMessageCount = linesParsed;

    let locale = 'raffles.announce-raffle';
    if (raffle.type === TYPE_TICKETS) {
      locale = 'raffles.announce-ticket-raffle';
    }

    const eligibility: string[] = [];
    if (raffle.forSubscribers === true) {
      eligibility.push(prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(prepare('raffles.eligibility-everyone-item'));
    }

    const count = raffle.participants.reduce((a, b) => {
      a += b.tickets;
      return a;
    }, 0);
    let message = prepare(locale, {
      l10n_entries: getLocalizedName(count, translate('core.entries')),
      count,
      keyword:      raffle.keyword,
      min:          raffle.minTickets,
      max:          raffle.maxTickets,
      eligibility:  eligibility.join(', '),
    });
    if (this.deleteRaffleJoinCommands) {
      message += ' ' + prepare('raffles.join-messages-will-be-deleted');
    }
    announce(message, 'raffles');
    this.timeouts.raffleAnnounce = global.setTimeout(() => this.announce(), 60000);
  }

  @command('!raffle remove')
  @default_permission(defaultPermissions.CASTERS)
  async remove (opts: CommandOptions): Promise<CommandResponse[]> {
    const raffle = await AppDataSource.getRepository(Raffle).findOneBy({ winner: IsNull(), isClosed: false });
    if (raffle) {
      await AppDataSource.getRepository(Raffle).remove(raffle);
    }
    return [];
  }

  @command('!raffle open')
  @default_permission(defaultPermissions.CASTERS)
  async open (opts: CommandOptions): Promise<CommandResponse[]> {
    const [subscribers] = [opts.parameters.indexOf('subscribers') >= 0];
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
    const raffle = await AppDataSource.getRepository(Raffle).findOneBy({ winner: IsNull(), isClosed: false });
    if (raffle) {
      const response = prepare('raffles.raffle-is-already-running', { keyword: raffle.keyword });
      return [{ response, ...opts }];
    }

    await AppDataSource.getRepository(Raffle).save({
      keyword:        keyword,
      forSubscribers: subscribers,
      minTickets,
      maxTickets,
      type:           type,
      winner:         null,
      isClosed:       false,
      timestamp:      Date.now(),
    });

    announceNewEntriesCount = 0;
    announceNewEntriesTime = 0;

    const eligibility: string[] = [];
    if (subscribers) {
      eligibility.push(prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(prepare('raffles.eligibility-everyone-item'));
    }

    let response = prepare(type === TYPE_NORMAL ? 'raffles.announce-raffle' : 'raffles.announce-ticket-raffle', {
      l10n_entries: getLocalizedName(0, translate('core.entries')),
      count:        0,
      keyword:      keyword,
      eligibility:  eligibility.join(', '),
      min:          minTickets,
      max:          maxTickets,
    });

    this.lastAnnounce = Date.now();
    if (this.deleteRaffleJoinCommands) {
      response += ' ' + prepare('raffles.join-messages-will-be-deleted');
    }
    announce(response, 'raffles'); // we are announcing raffle so it is send to all relevant channels
    return [];
  }

  @command('!raffle')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({ where: { winner: IsNull(), isClosed: false }, relations: ['participants'] });

    if (!raffle) {
      const response = prepare('raffles.no-raffle-is-currently-running');
      return [{ response, ...opts }];
    }

    let locale = 'raffles.announce-raffle';
    if (raffle.type === TYPE_TICKETS) {
      locale = 'raffles.announce-ticket-raffle';
    }

    const eligibility: string[] = [];
    if (raffle.forSubscribers === true) {
      eligibility.push(prepare('raffles.eligibility-subscribers-item'));
    }
    if (_.isEmpty(eligibility)) {
      eligibility.push(prepare('raffles.eligibility-everyone-item'));
    }

    const count = raffle.participants.reduce((a, b) => {
      a += b.tickets;
      return a;
    }, 0);
    let response = prepare(locale, {
      l10n_entries: getLocalizedName(count, translate('core.entries')),
      count,
      keyword:      raffle.keyword,
      min:          raffle.minTickets,
      max:          raffle.maxTickets,
      eligibility:  eligibility.join(', '),
    });
    if (this.deleteRaffleJoinCommands) {
      response += ' ' + prepare('raffles.join-messages-will-be-deleted');
    }
    return [{ response, ...opts }];
  }

  @parser({ fireAndForget: true })
  @timer()
  async participate (opts: ParserOptions): Promise<boolean> {
    if (opts.sender === null || _.isNil(opts.sender.userName) || !opts.message.match(/^(![\S]+)/)) {
      return true;
    }

    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where:     { winner: IsNull(), isClosed: false },
    });

    if (!raffle) {
      return true;
    }

    const user = await changelog.get(opts.sender.userId);
    if (!user) {
      changelog.update(opts.sender.userId, { userName: opts.sender.userName });
      return this.participate(opts);
    }

    const isStartingWithRaffleKeyword
      = raffle.type === TYPE_TICKETS
        ? opts.message.toLowerCase().startsWith(raffle.keyword.toLowerCase() + ' ')
        : opts.message.toLowerCase().trim() === raffle.keyword.toLowerCase();
    if (!isStartingWithRaffleKeyword) {
      return true;
    }
    if (this.deleteRaffleJoinCommands) {
      tmiEmitter.emit('delete', opts.id);
    }

    opts.message = opts.message.toString().replace(raffle.keyword, '');
    let tickets = opts.message.trim() === 'all' && !_.isNil(await points.getPointsOf(opts.sender.userId)) ? await points.getPointsOf(opts.sender.userId) : parseInt(opts.message.trim(), 10);

    if ((!_.isFinite(tickets) || tickets <= 0 || tickets < raffle.minTickets) && raffle.type === TYPE_TICKETS) {
      return false;
    }
    if (!_.isFinite(tickets)) {
      tickets = 0;
    }

    const participant = raffle.participants.find(o => o.username === opts.sender?.userName);
    let curTickets = 0;
    if (participant) {
      curTickets = participant.tickets;
    }
    let newTickets = curTickets + tickets;

    const userPoints = await points.getPointsOf(opts.sender.userId);
    if (raffle.type === TYPE_TICKETS && userPoints < tickets) {
      if (this.allowOverTicketing) {
        newTickets = curTickets + userPoints;
      } else {
        return false;
      }
    } // user doesn't have enough points

    if (newTickets > raffle.maxTickets && raffle.type === TYPE_TICKETS) {
      newTickets = raffle.maxTickets;
    }

    const selectedParticipant = {
      ...participant,
      raffle,
      isEligible:   participant?.isEligible ?? true,
      username:     opts.sender.userName,
      tickets:      raffle.type === TYPE_NORMAL ? 1 : newTickets,
      messages:     [],
      isSubscriber: user.isSubscriber,
    };

    if (raffle.forSubscribers && selectedParticipant.isEligible) {
      selectedParticipant.isEligible = user.isSubscriber;
    }

    if (selectedParticipant.isEligible && selectedParticipant.tickets > 0) {
      if (announceNewEntriesTime === 0) {
        announceNewEntriesTime = Date.now() + this.announceNewEntriesBatchTime * 1000;
      }
      if (raffle.type === TYPE_TICKETS) {
        announceNewEntriesCount += newTickets - curTickets;
        await points.decrement({ userId: opts.sender.userId }, newTickets - curTickets);
      } else {
        announceNewEntriesCount += 1;
      }
      if (!this.announceNewEntries) {
        announceNewEntriesCount = 0;
        announceNewEntriesTime = 0;
      }

      debug('raffle', '------------------------------------------------------------------------------------------------');
      debug('raffle', `Eligible user ${opts.sender.userName}#${opts.sender.userId} for raffle ${raffle.id}`);
      debug('raffle', opts.sender);
      debug('raffle', selectedParticipant);
      debug('raffle', user);
      debug('raffle', '------------------------------------------------------------------------------------------------');
      await AppDataSource.getRepository(RaffleParticipant).save(selectedParticipant);
      return true;
    } else {
      return false;
    }
  }

  @command('!raffle pick')
  @default_permission(defaultPermissions.CASTERS)
  async pick (opts: CommandOptions): Promise<CommandResponse[]> {
    const raffle = (await AppDataSource.getRepository(Raffle).find({
      relations: ['participants'],
      order:     { timestamp: 'DESC' },
      take:      1,
    }))[0];
    if (!raffle) {
      return [];
    } // no raffle ever

    if (raffle.participants.length === 0) {
      const response = prepare('raffles.no-participants-to-pick-winner');
      // close raffle on pick
      await AppDataSource.getRepository(Raffle).save({
        ...raffle, isClosed: true, timestamp: Date.now(),
      });
      return [{ response, ...opts }];
    }

    let _total = 0;
    const [sLuck] = await Promise.all([this.subscribersPercent]);
    for (const participant of raffle.participants.filter((o) => o.isEligible)) {
      if (participant.isSubscriber) {
        _total = _total + ((participant.tickets / 100) * sLuck);
      } else {
        _total = _total + participant.tickets;
      }
    }

    let winNumber = _.random(0, _total - 1, false);
    let winner: Readonly<RaffleParticipantInterface> | null = null;
    for (const participant of raffle.participants.filter((o) => o.isEligible)) {
      let tickets = participant.tickets;

      if (participant.isSubscriber) {
        tickets = ((participant.tickets / 100) * sLuck);
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
      }
    }

    const probability = (tickets / _total * 100);

    // uneligible winner (don't want to pick second time same user if repick)
    if (winner) {
      await Promise.all([
        AppDataSource.getRepository(RaffleParticipant).save({ ...winner, isEligible: false }),
        AppDataSource.getRepository(Raffle).save({
          ...raffle, winner: winner.username, isClosed: true, timestamp: Date.now(),
        }),
      ]);

      const response = prepare('raffles.raffle-winner-is', {
        username:    winner.username,
        keyword:     raffle.keyword,
        probability: _.round(probability, 2),
      });
      announce(response, 'raffles');
    } else {
      // close raffle on pick
      await AppDataSource.getRepository(Raffle).save({
        ...raffle, isClosed: true, timestamp: Date.now(),
      }),
      warning('No winner found in raffle');
    }
    return [];
  }
}

export default new Raffles();
