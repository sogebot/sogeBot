'use strict';

import * as _ from 'lodash';

import { prepare, sendMessage } from '../commons';
import { command, default_permission } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';

import { User, UserInterface } from '../database/entity/user';
import { getRepository } from 'typeorm';
import { Rank, RankInterface } from '../database/entity/rank';
import { adminEndpoint } from '../helpers/socket';
import users from '../users';
import { translate } from '../translate';

/*
 * !rank                       - show user rank
 * !rank add <hours> <rank>    - add <rank> for selected <hours>
 * !rank remove <hours>        - remove rank for selected <hours>
 * !rank list                  - show rank list
 * !rank set <username> <rank> - set custom <rank> for <username>
 * !rank unset <username>      - unset custom rank for <username>
 */

class Ranks extends System {
  constructor () {
    super();
    this.addMenu({ category: 'manage', name: 'ranks', id: 'manage/ranks/list' });
  }

  sockets () {
    adminEndpoint(this.nsp, 'ranks::getAll', async (cb) => {
      cb(await getRepository(Rank).find({
        order: {
          hours: 'ASC',
        },
      }));
    });
    adminEndpoint(this.nsp, 'ranks::getOne', async (id, cb) => {
      cb(await getRepository(Rank).findOne(id));
    });
    adminEndpoint(this.nsp, 'ranks::remove', async (id, cb) => {
      await getRepository(Rank).delete(id);
      cb();
    });
    adminEndpoint(this.nsp, 'ranks::save', async (item: Required<RankInterface>, cb) => {
      try {
        await getRepository(Rank).save(item);
        cb(null, item);
      } catch (e) {
        cb(e, item);
      }
    });
  }

  @command('!rank add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    const parsed = opts.parameters.match(/^(\d+) ([\S].+)$/);

    if (_.isNil(parsed)) {
      const message = await prepare('ranks.rank-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }


    const hours = parseInt(parsed[1], 10);
    const rank = await getRepository(Rank).findOne({ hours });
    if (!rank) {
      await getRepository(Rank).save({
        hours, rank: parsed[2],
      });
    }

    const message = await prepare(!rank ? 'ranks.rank-was-added' : 'ranks.ranks-already-exist', { rank: parsed[2], hours });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!rank edit')
  @default_permission(permission.CASTERS)
  async edit (opts) {
    const parsed = opts.parameters.match(/^(\d+) ([\S].+)$/);

    if (_.isNil(parsed)) {
      const message = await prepare('ranks.rank-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const hours = parsed[1];
    const rank = parsed[2];

    const item = await getRepository(Rank).findOne({ hours: parseInt(hours, 10) });
    if (!item) {
      const message = await prepare('ranks.rank-was-not-found', { hours: hours });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await getRepository(Rank).save({
      ...item, rank,
    });
    const message = await prepare('ranks.rank-was-edited', { hours: parseInt(hours, 10), rank: rank });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!rank set')
  @default_permission(permission.CASTERS)
  async set (opts) {
    const parsed = opts.parameters.match(/^([\S]+) ([\S ]+)$/);

    if (_.isNil(parsed)) {
      const message = await prepare('ranks.rank-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await getRepository(User).update({ userId: parsed[1] }, { haveCustomRank: true, rank: parsed[2].trim() });
    const message = await prepare('ranks.custom-rank-was-set-to-user', { rank: parsed[2].trim(), username: parsed[1] });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!rank unset')
  @default_permission(permission.CASTERS)
  async unset (opts) {
    const parsed = opts.parameters.match(/^([\S]+)$/);

    if (_.isNil(parsed)) {
      const message = await prepare('ranks.rank-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await getRepository(User).update({ userId: parsed[1] }, { haveCustomRank: false, rank: '' });
    const message = await prepare('ranks.custom-rank-was-unset-for-user', { username: parsed[1] });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!rank help')
  @default_permission(permission.CASTERS)
  help (opts) {
    sendMessage(translate('core.usage') + ': !rank add <hours> <rank> | !rank edit <hours> <rank> | !rank remove <hour> | !rank list | !rank set <username> <rank> | !rank unset <username>', opts.sender, opts.attr);
  }

  @command('!rank list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    const ranks = await getRepository(Rank).find();
    const output = await prepare(ranks.length === 0 ? 'ranks.list-is-empty' : 'ranks.list-is-not-empty', { list: _.map(_.orderBy(ranks, 'hours', 'asc'), function (l) {
      return l.hours + 'h - ' + l.rank;
    }).join(', ') });
    sendMessage(output, opts.sender, opts.attr);
  }

  @command('!rank remove')
  @default_permission(permission.CASTERS)
  async remove (opts) {
    const parsed = opts.parameters.match(/^(\d+)$/);
    if (_.isNil(parsed)) {
      const message = await prepare('ranks.rank-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const hours = parseInt(parsed[1], 10);
    const removed = await getRepository(Rank).delete({ hours: hours });

    const message = await prepare(removed ? 'ranks.rank-was-removed' : 'ranks.rank-was-not-found', { hours: hours });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!rank')
  async main (opts) {
    const watched = await users.getWatchedOf(opts.sender.userId);
    const rank = await this.get(opts.sender.username);

    const ranks = await getRepository(Rank).find({
      order: {
        hours: 'DESC',
      },
    });
    const current = ranks.find(o => o.rank === rank);

    let nextRank: null | { hours: number; rank: string } = null;
    for (const _rank of ranks) {
      if (_rank.hours > watched / 1000 / 60 / 60) {
        nextRank = _rank;
      } else {
        break;
      }
    }

    if (_.isNil(rank) || !current) {
      const message = await prepare('ranks.user-dont-have-rank');
      sendMessage(message, opts.sender, opts.attr);
      return true;
    }

    if (!_.isNil(nextRank)) {
      const toNextRank = nextRank.hours - current.hours;
      const toNextRankWatched = watched / 1000 / 60 / 60 - current.hours;
      const toWatch = (toNextRank - toNextRankWatched);
      const percentage = 100 - (((toWatch) / toNextRank) * 100);
      const message = await prepare('ranks.show-rank-with-next-rank', { rank: rank, nextrank: `${nextRank.rank} ${percentage.toFixed(1)}% (${toWatch.toFixed(1)}h)` });
      sendMessage(message, opts.sender, opts.attr);
      return true;
    }

    const message = await prepare('ranks.show-rank-without-next-rank', { rank: rank });
    sendMessage(message, opts.sender, opts.attr);
  }

  async get (user: Required<UserInterface> | undefined) {
    if (!user) {
      return '';
    }

    if (user.haveCustomRank) {
      return user.rank;
    }

    const ranks = await getRepository(Rank).find({
      order: {
        hours: 'ASC',
      },
    });
    let rankToReturn: null | string = null;

    for (const rank of ranks) {
      if (user.watchedTime / 1000 / 60 / 60 >= rank.hours) {
        rankToReturn = rank.rank;
      } else {
        break;
      }
    }
    return rankToReturn;
  }
}

export default new Ranks();
