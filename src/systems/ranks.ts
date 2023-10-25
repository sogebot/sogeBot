import { Rank } from '@entity/rank.js';
import { User, UserInterface } from '@entity/user.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import * as _ from 'lodash-es';

import System from './_interface.js';
import { command, default_permission } from '../decorators.js';
import users from '../users.js';

import { AppDataSource } from '~/database.js';
import { prepare } from '~/helpers/commons/index.js';
import { app } from '~/helpers/panel.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import * as changelog from '~/helpers/user/changelog.js';
import { adminMiddleware } from '~/socket.js';
import { translate } from '~/translate.js';

/*
 * !rank                          - show user rank
 * !rank add <hours> <rank>       - add <rank> for selected <hours>
 * !rank add-sub <months> <rank>  - add <rank> for selected <hours>
 * !rank rm <hours>               - remove rank for selected <hours>
 * !rank rm-sub <months>          - remove rank for selected <months> of subscribers
 * !rank list                     - show rank list
 * !rank list-sub                 - show rank list for subcribers
 * !rank edit <hours> <rank>      - edit rank
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
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/ranks', adminMiddleware, async (req, res) => {
      res.send({
        data: await Rank.find(),
      });
    });
    app.get('/api/systems/ranks/:id', async (req, res) => {
      res.send({
        data: await Rank.findOne({ where: { id: req.params.id } }),
      });
    });
    app.delete('/api/systems/ranks/:id', adminMiddleware, async (req, res) => {
      const poll = await Rank.findOne({ where: { id: req.params.id } });
      await poll?.remove();
      res.status(404).send();
    });
    app.post('/api/systems/ranks', adminMiddleware, async (req, res) => {
      try {
        const itemToSave = Rank.create(req.body);
        res.send({ data: await itemToSave.validateAndSave() });
      } catch (e) {
        if (e instanceof Error) {
          res.status(400).send({ errors: e.message });
        } else {
          res.status(400).send({ errors: e });
        }
      }
    });
  }

  @command('!rank add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions, type: Rank['type'] = 'viewer'): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(\d+) ([\S].+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    const value = parseInt(parsed[1], 10);
    const rank = await AppDataSource.getRepository(Rank).findOneBy({ value, type });
    if (!rank) {
      await AppDataSource.getRepository(Rank).save({
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

  @command('!rank add-sub')
  @default_permission(defaultPermissions.CASTERS)
  async addsub (opts: CommandOptions): Promise<CommandResponse[]> {
    return this.add(opts, 'subscriber');
  }

  @command('!rank edit')
  @default_permission(defaultPermissions.CASTERS)
  async edit (opts: CommandOptions, type: Rank['type'] = 'viewer'): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(\d+) ([\S].+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    const value = parsed[1];
    const rank = parsed[2];

    const item = await AppDataSource.getRepository(Rank).findOneBy({ value: parseInt(value, 10), type });
    if (!item) {
      const response = prepare('ranks.rank-was-not-found', { value: value });
      return [{ response, ...opts }];
    }

    await AppDataSource.getRepository(Rank).save({ ...item, rank });
    const response = prepare('ranks.rank-was-edited',
      {
        hours:   parseInt(value, 10),
        rank,
        type,
        hlocale: getLocalizedName(value, translate(type === 'viewer' ? 'core.hours' : 'core.months')),
      });
    return [{ response, ...opts }];
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

    await changelog.flush();
    await AppDataSource.getRepository(User).update({ userName: parsed[1] }, { haveCustomRank: true, rank: parsed[2].trim() });
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
    await changelog.flush();
    await AppDataSource.getRepository(User).update({ userName: parsed[1] }, { haveCustomRank: false, rank: '' });
    const response = prepare('ranks.custom-rank-was-unset-for-user', { username: parsed[1] });
    return [{ response, ...opts }];
  }

  @command('!rank help')
  @default_permission(defaultPermissions.CASTERS)
  help (opts: CommandOptions): CommandResponse[] {
    let url = 'http://sogebot.github.io/sogeBot/#/systems/ranks';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogebot.github.io/sogeBot/#/_master/systems/ranks';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!rank list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions, type: Rank['type'] = 'viewer'): Promise<CommandResponse[]> {
    const ranks = await AppDataSource.getRepository(Rank).findBy({ type });
    const response = prepare(ranks.length === 0 ? 'ranks.list-is-empty' : 'ranks.list-is-not-empty', {
      list: _.orderBy(ranks, 'value', 'asc').map((l) => {
        return l.value + 'h - ' + l.rank;
      }).join(', '),
    });
    return [{ response, ...opts }];
  }

  @command('!rank list-sub')
  @default_permission(defaultPermissions.CASTERS)
  async listsub (opts: CommandOptions) {
    return this.list(opts, 'subscriber');
  }

  @command('!rank rm')
  @default_permission(defaultPermissions.CASTERS)
  async rm (opts: CommandOptions, type: Rank['type'] = 'viewer'): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(\d+)$/);
    if (_.isNil(parsed)) {
      const response = prepare('ranks.rank-parse-failed');
      return [{ response, ...opts }];
    }

    const value = parseInt(parsed[1], 10);
    const removed = await AppDataSource.getRepository(Rank).delete({ value, type });

    const response = prepare(removed ? 'ranks.rank-was-removed' : 'ranks.rank-was-not-found',
      {
        hours:   value,
        type,
        hlocale: getLocalizedName(value, translate(type === 'viewer' ? 'core.hours' : 'core.months')),
      });
    return [{ response, ...opts }];
  }

  @command('!rank rm-sub')
  @default_permission(defaultPermissions.CASTERS)
  async rmsub (opts: CommandOptions) {
    return this.rm(opts, 'subscriber');
  }

  @command('!rank')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    const user = await changelog.get(opts.sender.userId);
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

  async get (user: Required<UserInterface> | null): Promise<{current: null | string | Required<Rank>; next: null | Required<Rank>}> {
    if (!user) {
      return { current: null, next: null };
    }

    if (user.haveCustomRank) {
      return { current: user.rank, next: null };
    }

    const ranks = await AppDataSource.getRepository(Rank).find({ order: { value: 'DESC' } });

    let rankToReturn: null | Required<Rank> = null;
    let subNextRank: null | Required<Rank> = null;
    let nextRank: null | Required<Rank> = null;

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

    // watched time rank
    for (const rank of ranks) {
      if (user.watchedTime / 1000 / 60 / 60 >= rank.value) {
        rankToReturn = rank;
        break;
      } else {
        nextRank = rank;
      }
    }
    return { current: rankToReturn, next: subNextRank || nextRank };
  }
}

export default new Ranks();
