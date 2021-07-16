'use strict';

import * as _ from 'lodash';
import { getRepository } from 'typeorm';

import { Rank, RankInterface } from '../database/entity/rank';
import { User, UserInterface } from '../database/entity/user';
import { command, default_permission } from '../decorators';
import { prepare } from '../helpers/commons';
import { dayjs } from '../helpers/dayjs';
import { getLocalizedName } from '../helpers/getLocalized';
import { defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import { translate } from '../translate';
import users from '../users';
import System from './_interface';

/*
 * !rank                          - show user rank
 * !rank add <hours> <rank>       - add <rank> for selected <hours>
 * !rank add-flw <months> <rank>  - add <rank> for selected <hours>
 * !rank add-sub <months> <rank>  - add <rank> for selected <hours>
 * !rank rm <hours>               - remove rank for selected <hours>
 * !rank rm-flw <months>          - remove rank for selected <months> of followers
 * !rank rm-sub <months>          - remove rank for selected <months> of subscribers
 * !rank list                     - show rank list
 * !rank list-flw                 - show rank list for followers
 * !rank list-sub                 - show rank list for subcribers
 * !rank edit <hours> <rank>      - edit rank
 * !rank edit-flw <months> <rank> - edit rank for followers
 * !rank edit-sub <months> <rank> - edit rank for subcribers
 * !rank set <username> <rank>    - set custom <rank> for <username>
 * !rank unset <username>         - unset custom rank for <username>
 */

class Ranks extends System {
  constructor () {
    super();
    this.addMenu({
      category: 'manage', name: 'ranks', id: 'manage/ranks', this: this,
    });
  }

  sockets () {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(Rank).find({ order: { value: 'ASC' } }));
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      try {
        cb(null, await getRepository(Rank).findOne(id));
      } catch(e) {
        cb(e.stack, undefined);
      }
    });
    adminEndpoint(this.nsp, 'ranks::remove', async (id, cb) => {
      try {
        await getRepository(Rank).delete(id);
        cb ? cb(null) : null;
      } catch (e) {
        cb ? cb(e.stack) : null;
      }
    });
    adminEndpoint(this.nsp, 'ranks::save', async (item, cb) => {
      try {
        await getRepository(Rank).save(item);
        cb(null, item);
      } catch (e) {
        cb(e.stack, item);
      }
    });
  }

  @command('!rank add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions, type: RankInterface['type'] = 'viewer'): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(\d+) ([\S].+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    const value = parseInt(parsed[1], 10);
    const rank = await getRepository(Rank).findOne({ value, type });
    if (!rank) {
      await getRepository(Rank).save({
        value, rank: parsed[2], type,
      });
    }

    const response = prepare(!rank ? 'ranks.rank-was-added' : 'ranks.rank-already-exist',
      {
        rank:    parsed[2],
        hours:   value,
        type,
        hlocale: getLocalizedName(value, translate(type === 'viewer' ? 'core.hours' : 'core.months')),
      });
    return [{ response, ...opts }];
  }

  @command('!rank add-flw')
  @default_permission(defaultPermissions.CASTERS)
  async addflw (opts: CommandOptions): Promise<CommandResponse[]> {
    return this.add(opts, 'follower');
  }

  @command('!rank add-sub')
  @default_permission(defaultPermissions.CASTERS)
  async addsub (opts: CommandOptions): Promise<CommandResponse[]> {
    return this.add(opts, 'subscriber');
  }

  @command('!rank edit')
  @default_permission(defaultPermissions.CASTERS)
  async edit (opts: CommandOptions, type: RankInterface['type'] = 'viewer'): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(\d+) ([\S].+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    const value = parsed[1];
    const rank = parsed[2];

    const item = await getRepository(Rank).findOne({ value: parseInt(value, 10), type });
    if (!item) {
      const response = prepare('ranks.rank-was-not-found', { value: value });
      return [{ response, ...opts }];
    }

    await getRepository(Rank).save({ ...item, rank });
    const response = prepare('ranks.rank-was-edited',
      {
        hours:   parseInt(value, 10),
        rank,
        type,
        hlocale: getLocalizedName(value, translate(type === 'viewer' ? 'core.hours' : 'core.months')),
      });
    return [{ response, ...opts }];
  }

  @command('!rank edit-flw')
  @default_permission(defaultPermissions.CASTERS)
  async editflw (opts: CommandOptions) {
    return this.edit(opts, 'follower');
  }

  @command('!rank edit-sub')
  @default_permission(defaultPermissions.CASTERS)
  async editsub (opts: CommandOptions) {
    return this.edit(opts, 'subscriber');
  }

  @command('!rank set')
  @default_permission(defaultPermissions.CASTERS)
  async set (opts: CommandOptions): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^([\S]+) ([\S ]+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    await getRepository(User).update({ username: parsed[1] }, { haveCustomRank: true, rank: parsed[2].trim() });
    const response = prepare('ranks.custom-rank-was-set-to-user', { rank: parsed[2].trim(), username: parsed[1] });
    return [{ response, ...opts }];
  }

  @command('!rank unset')
  @default_permission(defaultPermissions.CASTERS)
  async unset (opts: CommandOptions): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^([\S]+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    await getRepository(User).update({ username: parsed[1] }, { haveCustomRank: false, rank: '' });
    const response = prepare('ranks.custom-rank-was-unset-for-user', { username: parsed[1] });
    return [{ response, ...opts }];
  }

  @command('!rank help')
  @default_permission(defaultPermissions.CASTERS)
  help (opts: CommandOptions): CommandResponse[] {
    let url = 'http://sogehige.github.io/sogeBot/#/systems/ranks';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogehige.github.io/sogeBot/#/_master/systems/ranks';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!rank list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions, type: RankInterface['type'] = 'viewer'): Promise<CommandResponse[]> {
    const ranks = await getRepository(Rank).find({ type });
    const response = prepare(ranks.length === 0 ? 'ranks.list-is-empty' : 'ranks.list-is-not-empty', {
      list: _.orderBy(ranks, 'value', 'asc').map((l) => {
        return l.value + 'h - ' + l.rank;
      }).join(', '),
    });
    return [{ response, ...opts }];
  }

  @command('!rank list-flw')
  @default_permission(defaultPermissions.CASTERS)
  async listflw (opts: CommandOptions) {
    return this.list(opts, 'follower');
  }

  @command('!rank list-sub')
  @default_permission(defaultPermissions.CASTERS)
  async listsub (opts: CommandOptions) {
    return this.list(opts, 'subscriber');
  }

  @command('!rank rm')
  @default_permission(defaultPermissions.CASTERS)
  async rm (opts: CommandOptions, type: RankInterface['type'] = 'viewer'): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(\d+)$/);
    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    const value = parseInt(parsed[1], 10);
    const removed = await getRepository(Rank).delete({ value, type });

    const response = prepare(removed ? 'ranks.rank-was-removed' : 'ranks.rank-was-not-found',
      {
        hours:   value,
        type,
        hlocale: getLocalizedName(value, translate(type === 'viewer' ? 'core.hours' : 'core.months')),
      });
    return [{ response, ...opts }];
  }

  @command('!rank rm-flw')
  @default_permission(defaultPermissions.CASTERS)
  async rmflw (opts: CommandOptions) {
    return this.rm(opts, 'follower');
  }

  @command('!rank rm-sub')
  @default_permission(defaultPermissions.CASTERS)
  async rmsub (opts: CommandOptions) {
    return this.rm(opts, 'subscriber');
  }

  @command('!rank')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    const user = await getRepository(User).findOne({ userId: opts.sender.userId });
    const watched = await users.getWatchedOf(opts.sender.userId);
    const rank = await this.get(user);

    if (_.isNil(rank.current)) {
      const response = prepare('ranks.user-dont-have-rank');
      return [{ response, ...opts }];
    }

    if (!_.isNil(rank.next) && typeof rank.current === 'object') {
      if (rank.next.type === 'viewer') {
        const toNextRank = rank.next.value - (rank.current.type === 'viewer' ? rank.current.value : 0);
        const toNextRankWatched = watched / 1000 / 60 / 60 - (rank.current.type === 'viewer' ? rank.current.value : 0);
        const toWatch = (toNextRank - toNextRankWatched);
        const percentage = 100 - (((toWatch) / toNextRank) * 100);
        const response = prepare('ranks.show-rank-with-next-rank', { rank: rank.current.rank, nextrank: `${rank.next.rank} ${percentage.toFixed(1)}% (${toWatch.toFixed(1)} ${getLocalizedName(toWatch.toFixed(1), translate('core.hours'))})` });
        return [{ response, ...opts }];
      }
      if (rank.next.type === 'follower') {
        const toNextRank = rank.next.value - (rank.current.type === 'follower' ? rank.current.value : 0);
        const toNextRankFollow = dayjs(Date.now()).diff(dayjs(user?.followedAt || 0), 'month', true);
        const toWatch = (toNextRank - toNextRankFollow);
        const percentage = 100 - (((toWatch) / toNextRank) * 100);
        const response = prepare('ranks.show-rank-with-next-rank', { rank: rank.current.rank, nextrank: `${rank.next.rank} ${percentage.toFixed(1)}% (${toWatch.toFixed(1)} ${getLocalizedName(toWatch.toFixed(1), translate('core.months'))})` });
        return [{ response, ...opts }];
      }
      if (rank.next.type === 'subscriber') {
        const toNextRank = rank.next.value - (rank.current.type === 'subscriber' ? rank.current.value : 0);
        const toNextRankSub = (user?.subscribeCumulativeMonths || 0) - (rank.current.type === 'subscriber' ? rank.current.value : 0);
        const toWatch = (toNextRank - toNextRankSub);
        const percentage = 100 - (((toWatch) / toNextRank) * 100);
        const response = prepare('ranks.show-rank-with-next-rank', { rank: rank.current.rank, nextrank: `${rank.next.rank} ${percentage.toFixed(1)}% (${toWatch.toFixed(1)} ${getLocalizedName(toWatch.toFixed(1), translate('core.months'))})` });
        return [{ response, ...opts }];
      }
    }

    const response = prepare('ranks.show-rank-without-next-rank', { rank: typeof rank.current === 'string' ? rank.current : rank.current.rank });
    return [{ response, ...opts }];
  }

  async get (user: Required<UserInterface> | undefined): Promise<{current: null | string | Required<RankInterface>; next: null | Required<RankInterface>}> {
    if (!user) {
      return { current: null, next: null };
    }

    if (user.haveCustomRank) {
      return { current: user.rank, next: null };
    }

    const ranks = await getRepository(Rank).find({ order: { value: 'DESC' } });

    let rankToReturn: null | Required<RankInterface> = null;
    let subNextRank: null | Required<RankInterface> = null;
    let flwNextRank: null | Required<RankInterface> = null;
    let nextRank: null | Required<RankInterface> = null;

    if (user.isSubscriber) {
      // search for sub rank
      const subRanks = ranks.filter(o => o.type === 'subscriber');
      for (const rank of subRanks) {
        if (user.subscribeCumulativeMonths >= rank.value) {
          rankToReturn = rank;
          break;
        } else {
          subNextRank = rank;
        }
      }

      if (rankToReturn) {
        return { current: rankToReturn, next: subNextRank };
      }
    }

    if (user.isFollower) {
      // search for follower rank
      const flwRank = ranks.filter(o => o.type === 'follower');
      for (const rank of flwRank) {
        const followedAtDiff = dayjs(Date.now()).diff(dayjs(user.followedAt), 'month', true);
        if (followedAtDiff >= rank.value) {
          rankToReturn = rank;
          break;
        } else {
          flwNextRank = rank;
        }
      }

      if (rankToReturn) {
        return { current: rankToReturn, next: subNextRank || flwNextRank };
      }
    }

    // watched time rank
    for (const rank of ranks) {
      if (user.watchedTime / 1000 / 60 / 60 >= rank.value) {
        rankToReturn = rank;
        break;
      } else {
        nextRank = rank;
      }
    }
    return { current: rankToReturn, next: subNextRank || flwNextRank || nextRank };
  }
}

export default new Ranks();
