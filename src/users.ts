import { setTimeout } from 'timers';

import { Request } from 'express';
import {
  Brackets,
} from 'typeorm';

import { Delete, ErrorNotFound, Get, Post } from './decorators/endpoint.js';
import { HOUR } from './helpers/constants.js';
import { defaultPermissions } from './helpers/permissions/defaultPermissions.js';
import { getUserHighestPermission } from './helpers/permissions/getUserHighestPermission.js';
import getNameById from './helpers/user/getNameById.js';

import Core from '~/_interface.js';
import { Permissions } from '~/database/entity/permissions.js';
import {
  User, UserBit, UserInterface, UserTip,
} from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { onStartup } from '~/decorators/on.js';
import { isStreamOnline, stats } from '~/helpers/api/index.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import {
  debug, error,
} from '~/helpers/log.js';
import * as changelog from '~/helpers/user/changelog.js';
import { getIdFromTwitch } from '~/services/twitch/calls/getIdFromTwitch.js';

class Users extends Core {
  constructor () {
    super();
    this.addMenu({
      category: 'manage', name: 'viewers', id: 'manage/viewers', this: null,
    });
  }

  @onStartup()
  startup() {
    this.updateWatchTime(true);
    this.checkDuplicateUsernames();
  }

  async checkDuplicateUsernames() {
    let query;
    await changelog.flush();

    await AppDataSource.getRepository(User).delete({
      userName: '__AnonymousUser__',
    });

    if (AppDataSource.options.type === 'postgres') {
      query = AppDataSource.getRepository(User).createQueryBuilder('user')
        .select('COUNT(*)')
        .addSelect('"user"."userName"')
        .groupBy('"user"."userName"')
        .having('COUNT(*) > 1');
    } else {
      query = AppDataSource.getRepository(User).createQueryBuilder('user')
        .select('COUNT(*)', 'count')
        .addSelect('user.userName')
        .groupBy('user.userName')
        .having('count > 1');
    }
    const viewers = await query.getRawMany();
    if (viewers.length > 0) {
      debug('users', `Duplicate usernames: ${viewers.map(o => o.user_userName).join(', ')}`);
    } else {
      debug('users', `No duplicated usernames found.`);
    }
    await Promise.all(viewers.map(async (duplicate) => {
      const userName = duplicate.user_userName;
      const duplicates = await AppDataSource.getRepository(User).find({ where: { userName } });
      await Promise.all(duplicates.map(async (user) => {
        try {
          const twitch = ( await import('./services/twitch.js')).default;
          const getUserById = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserById(user.userId));
          if (!getUserById) {
            throw new Error('unknown');
          }
          if (getUserById.name !== userName) {
            changelog.update(user.userId, { userName: getUserById.name });
            debug('users', `Duplicate username ${user.userName}#${user.userId} changed to ${getUserById.name}#${user.userId}`);
          }
        } catch (e) {
          if (e instanceof Error) {
            if (e.message.includes('not found in auth provider')) {
              return; // do duplication check next time
            }
          }
          // remove users not in Twitch anymore
          debug('users', `Duplicate username ${user.userName}#${user.userId} not found on Twitch => '__inactive__${user.userName}#${user.userId}`);
          changelog.update(user.userId, { userName: '__inactive__' + user.userName });
        }
      }));
    }));
    setTimeout(() => this.checkDuplicateUsernames(), HOUR);
  }

  async getChatOf (id: string, online: boolean): Promise<number> {
    const user = await changelog.get(id);
    let chat = 0;

    if (user) {
      if (online) {
        chat = user.chatTimeOnline;
      } else {
        chat = user.chatTimeOffline;
      }

      return Number(chat) <= Number.MAX_SAFE_INTEGER
        ? chat
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async updateWatchTime (isInit = false) {
    const interval = 30000;
    try {
      if (isInit) {
        // set all users offline on start
        debug('tmi.watched', `Setting all users as offline.`);
        await changelog.flush();
        await AppDataSource.getRepository(User).update({}, { isOnline: false });
      } else {
        // get new users
        await changelog.flush();
        const newChatters = await AppDataSource.getRepository(User).find({ where: { isOnline: true, watchedTime: 0 } });
        debug('tmi.watched', `Adding ${newChatters.length} users as new chatters.`);
        stats.value.newChatters = stats.value.newChatters + newChatters.length;

        if (isStreamOnline.value) {
          debug('tmi.watched', `Incrementing watchedTime by ${interval}`);
          await changelog.flush();
          const incrementedUsers = await AppDataSource.getRepository(User).increment({ isOnline: true }, 'watchedTime', interval);
          // chatTimeOnline + chatTimeOffline is solely use for points distribution
          debug('tmi.watched', `Incrementing chatTimeOnline by ${interval}`);
          await changelog.flush();
          await AppDataSource.getRepository(User).increment({ isOnline: true }, 'chatTimeOnline', interval);

          if (typeof incrementedUsers.affected === 'undefined') {
            await changelog.flush();
            const users = await AppDataSource.getRepository(User).find({ where: { isOnline: true } });
            if (isDebugEnabled('tmi.watched')) {
              for (const user of users) {
                debug('tmi.watched', `User ${user.userName}#${user.userId} added watched time ${interval}`);
              }
            }
            stats.value.currentWatchedTime = stats.value.currentWatchedTime + users.length * interval;
          } else {
            stats.value.currentWatchedTime = stats.value.currentWatchedTime + incrementedUsers.affected * interval;
          }
        } else {
          debug('tmi.watched', `Incrementing chatTimeOffline users by ${interval}`);
          await changelog.flush();
          await AppDataSource.getRepository(User).increment({ isOnline: true }, 'chatTimeOffline', interval);
        }
      }
    } catch (e: any) {
      error(e.stack);
    } finally {
      setTimeout(() => this.updateWatchTime(), interval);
    }
  }

  async getWatchedOf (id: string): Promise<number> {
    const user = await changelog.get(id);

    if (user) {
      return Number(user.watchedTime) <= Number.MAX_SAFE_INTEGER
        ? user.watchedTime
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getMessagesOf (id: string): Promise<number> {
    const user = await changelog.get(id);

    if (user) {
      return Number(user.messages) <= Number.MAX_SAFE_INTEGER
        ? user.messages
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getUsernamesFromIds (IdsList: string[]) {
    const uniqueWithUsername = (await Promise.all(
      [...new Set(IdsList)]
        .map(async (id) => {
          const user = await changelog.get(id);
          if (user) {
            return { [id]: user.userName };
          }
          return { [id]: 'n/a' };
        }),
    )).reduce((prev, cur) => {
      const entries = Object.entries(cur)[0];
      return { ...prev, [entries[0]]: entries[1] };
    }, {});

    return new Map<string, string>(Object.entries(uniqueWithUsername));
  }

  async getIdByName (userName: string) {
    if (userName.startsWith('@')) {
      userName = userName.substring(1);
    }
    await changelog.flush();
    const user = await AppDataSource.getRepository(User).findOneBy({ userName });
    if (!user) {
      const userId = await getIdFromTwitch(userName);
      changelog.update(userId, { userName });
      return userId;
    }
    return user.userId;
  }

  async getUserByUserId(userId: string) {
    await changelog.flush();
    return changelog.get(userId) as Promise<Readonly<Required<UserInterface>>>;
  }

  async getUserByUsername(userName: string) {
    await changelog.flush();
    const userByUsername = await AppDataSource.getRepository(User).findOneBy({ userName });

    if (userByUsername) {
      return userByUsername;
    }

    const userId = await this.getIdByName(userName);
    await changelog.flush();
    return changelog.get(userId) as Promise<Readonly<Required<UserInterface>>>;
  }

  @Post('/', { action: 'resetPointsAll' })
  async resetPointsAll () {
    await changelog.flush();
    await AppDataSource.getRepository(User).update({}, { points: 0 });
  }
  @Post('/', { action: 'resetMessagesAll' })
  async resetMessagesAll () {
    await changelog.flush();
    await AppDataSource.getRepository(User).update({}, { messages: 0, pointsByMessageGivenAt: 0 });
  }
  @Post('/', { action: 'resetWatchedTimeAll' })
  async resetWatchedTimeAll () {
    await changelog.flush();
    await AppDataSource.getRepository(User).update({}, { watchedTime: 0 });
  }
  @Post('/', { action: 'resetSubgiftsAll' })
  async resetSubgiftsAll () {
    await changelog.flush();
    await AppDataSource.getRepository(User).update({}, { giftedSubscribes: 0 });
  }
  @Post('/', { action: 'resetBitsAll' })
  async resetBitsAll () {
    await AppDataSource.getRepository(UserBit).clear();
  }
  @Post('/', { action: 'resetTipsAll' })
  async resetTipsAll () {
    await AppDataSource.getRepository(UserTip).clear();
  }
  @Post('/:id', { action: 'getNameById' })
  async getNameById (req: Request) {
    return getNameById(req.params.id);
  }
  @Delete('/:id')
  async deleteOne(req: Request) {
    const userId = req.params.id;
    await changelog.flush();
    await AppDataSource.getRepository(UserTip).delete({ userId });
    await AppDataSource.getRepository(UserBit).delete({ userId });
    await AppDataSource.getRepository(User).delete({ userId });
  }
  @Get('/:id', { scope: 'public' })
  async getOne(req: Request) {
    await changelog.flush();
    let userId = req.params.id;
    if (req.query._query === 'userName') {
      userId = await this.getIdByName(userId);
    }

    const viewer = await changelog.get(userId);
    const tips =  await AppDataSource.getRepository(UserTip).find({ where: { userId } });
    const bits =  await AppDataSource.getRepository(UserBit).find({ where: { userId } });

    if (viewer) {
      const aggregatedTips = tips.map((o) => exchange(o.amount, o.currency, mainCurrency.value)).reduce((a, b) => a + b, 0);
      const aggregatedBits = bits.map((o) => Number(o.amount)).reduce((a, b) => a + b, 0);

      const permId = (await getUserHighestPermission(userId)).id;
      const permissionGroup = await Permissions.findOneByOrFail({ id: permId || defaultPermissions.VIEWERS });
      return {
        ...viewer, aggregatedBits, aggregatedTips, permission: permissionGroup, tips, bits,
      };
    }

    throw new ErrorNotFound();
  }

  @Get('/')
  async getAll(req: Request) {
    const order: { orderBy: string, sortOrder: 'ASC' | 'DESC' } = req.query.order
      ? (JSON.parse(String(req.query.order))) : { sortOrder: 'ASC', orderBy: 'user.username' };
    const opts = {
      order,
      page:                    req.query.page ? Number(req.query.page) : 0,
      perPage:                 req.query.perPage ? Number(req.query.perPage) : 25,
      filter:                  req.query.filter ? JSON.parse(String(req.query.filter)) : undefined,
      exactUsernameFromTwitch: req.query.exactUsernameFromTwitch ? Boolean(req.query.exactUsernameFromTwitch) : false,
      search:                  req.query.search ? String(req.query.search) : undefined,
      state:                   req.query.state ? String(req.query.state) : undefined,
    };
    if (opts.perPage === -1) {
      opts.perPage = Number.MAX_SAFE_INTEGER;
    }
    /*
      SQL query:
        select user.*, COALESCE(sumTips, 0) as sumTips, COALESCE(sumBits, 0) as sumBits
        from user
          left join (select userId, sum(sortAmount) as sumTips from user_tip group by userId) user_tip on user.userId = user_tip.userId
          left join (select userId, sum(amount) as sumBits from user_bit group by userId) user_bit on user.userId = user_bit.userId
    */
    await changelog.flush();
    let query;
    if (AppDataSource.options.type === 'postgres') {
      query = AppDataSource.getRepository(User).createQueryBuilder('user')
        .orderBy(opts.order.orderBy, opts.order?.sortOrder)
        .select('COALESCE("sumTips", 0)', 'sumTips')
        .addSelect('COALESCE("sumBits", 0)', 'sumBits')
        .addSelect('"user".*')
        .offset(opts.page * opts.perPage)
        .limit(opts.perPage)
        .leftJoin('(select "userId", sum("amount") as "sumBits" from "user_bit" group by "userId")', 'user_bit', '"user_bit"."userId" = "user"."userId"')
        .leftJoin('(select "userId", sum("sortAmount") as "sumTips" from "user_tip" group by "userId")', 'user_tip', '"user_tip"."userId" = "user"."userId"');
    } else {
      query = AppDataSource.getRepository(User).createQueryBuilder('user')
        .orderBy(opts.order.orderBy, opts.order?.sortOrder)
        .select('JSON_EXTRACT(`user`.`extra`, \'$.levels.xp\')', 'levelXP')
        .addSelect('COALESCE(sumTips, 0)', 'sumTips')
        .addSelect('COALESCE(sumBits, 0)', 'sumBits')
        .addSelect('user.*')
        .offset(opts.page * opts.perPage)
        .limit(opts.perPage)
        .leftJoin('(select userId, sum(amount) as sumBits from user_bit group by userId)', 'user_bit', 'user_bit.userId = user.userId')
        .leftJoin('(select userId, sum(sortAmount) as sumTips from user_tip group by userId)', 'user_tip', 'user_tip.userId = user.userId');
    }

    if (typeof req.query.orderBy !== 'undefined') {
      if (opts.order?.orderBy === 'level') {
        if (AppDataSource.options.type === 'better-sqlite3') {
          query.orderBy('LENGTH("levelXP")', opts.order?.sortOrder);
          query.addOrderBy('"levelXP"', opts.order?.sortOrder);
        } else if (AppDataSource.options.type === 'postgres') {
          query.orderBy('length(COALESCE(JSON_EXTRACT_PATH("extra"::json, \'levels\'), \'{}\')::text)', opts.order?.sortOrder);
          query.addOrderBy('COALESCE(JSON_EXTRACT_PATH("extra"::json, \'levels\'), \'{}\')::text', opts.order?.sortOrder);
        } else {
          query.orderBy('LENGTH(`levelXP`)', opts.order?.sortOrder);
          query.addOrderBy('`levelXP`', opts.order?.sortOrder);
        }
      } else if (AppDataSource.options.type === 'postgres') {
        opts.order.orderBy = opts.order?.orderBy.split('.').map(o => `"${o}"`).join('.');
        query.orderBy(opts.order?.orderBy, opts.order?.sortOrder);

      } else {
        query.orderBy({ [opts.order?.orderBy]: opts.order?.sortOrder });
      }
    }

    if (typeof opts.filter !== 'undefined') {
      for (const filter of opts.filter) {
        query.andWhere(new Brackets(w => {
          if (AppDataSource.options.type === 'postgres') {
            if (filter.operation === 'contains') {
              w.where(`CAST("user"."${filter.columnName}" AS TEXT) like :${filter.columnName}`, { [filter.columnName]: `%${filter.value}%` });
            } else if (filter.operation === 'equal') {
              w.where(`"user"."${filter.columnName}" = :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'notEqual') {
              w.where(`"user"."${filter.columnName}" != :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'greaterThanOrEqual') {
              w.where(`"user"."${filter.columnName}" >= :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'greaterThan') {
              w.where(`"user"."${filter.columnName}" >= :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'lessThanOrEqual') {
              w.where(`"user"."${filter.columnName}" <= :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'lessThan') {
              w.where(`"user"."${filter.columnName}" <= :${filter.columnName}`, { [filter.columnName]: filter.value });
            }
          } else {
            if (filter.operation === 'contains') {
              w.where(`CAST(\`user\`.\`${filter.columnName}\` AS CHAR) like :${filter.columnName}`, { [filter.columnName]: `%${filter.value}%` });
            } else if (filter.operation === 'equal') {
              w.where(`\`user\`.\`${filter.columnName}\` = :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'notEqual') {
              w.where(`\`user\`.\`${filter.columnName}\` != :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'greaterThanOrEqual') {
              w.where(`\`user\`.\`${filter.columnName}\` >= :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'greaterThan') {
              w.where(`\`user\`.\`${filter.columnName}\` > :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'lessThanOrEqual') {
              w.where(`\`user\`.\`${filter.columnName}\` <= :${filter.columnName}`, { [filter.columnName]: filter.value });
            } else if (filter.operation === 'lessThan') {
              w.where(`\`user\`.\`${filter.columnName}\` < :${filter.columnName}`, { [filter.columnName]: filter.value });
            }
          }
        }));
      }
    }

    const viewers = await query.getRawMany();

    const levels = (await import('~/systems/levels.js')).default;
    for (const viewer of viewers) {
      // add level to user
      viewer.extra = JSON.parse(viewer.extra);
      viewer.level = levels.getLevelOf(viewer);
    }
    let count = await query.getCount();

    if (opts.exactUsernameFromTwitch && opts.search) {
      // we need to check if viewers have already opts.search in list (we don't need to fetch twitch data)
      if (!viewers.find(o => o.userName === opts.search)) {
        try {
          const userId = await getIdFromTwitch(opts.search);
          viewers.unshift({ userId, userName: opts.search });
          count++;
        } catch (e: any) {
          // we don't care if user is not found
        }
      }
    }

    return { viewers, count, state: opts.state };
  }
}

export default new Users();
