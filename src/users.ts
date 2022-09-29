import { setTimeout } from 'timers';

import { HOUR } from '@sogebot/ui-helpers/constants';
import {
  Brackets, FindOneOptions, getConnection, getRepository, IsNull,
} from 'typeorm';

import client from './services/twitch/api/client';

import Core from '~/_interface';
import { Permissions } from '~/database/entity/permissions';
import {
  User, UserBit, UserInterface, UserTip,
} from '~/database/entity/user';
import { onStartup } from '~/decorators/on';
import { isStreamOnline, stats } from '~/helpers/api';
import { mainCurrency } from '~/helpers/currency';
import exchange from '~/helpers/currency/exchange';
import rates from '~/helpers/currency/rates';
import {
  debug, error, isDebugEnabled,
} from '~/helpers/log';
import { recacheOnlineUsersPermission } from '~/helpers/permissions';
import { defaultPermissions, getUserHighestPermission } from '~/helpers/permissions/index';
import { adminEndpoint, viewerEndpoint } from '~/helpers/socket';
import * as changelog from '~/helpers/user/changelog.js';
import { getIdFromTwitch } from '~/services/twitch/calls/getIdFromTwitch';

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
    const connection = await getConnection();
    try {
      let query;
      await changelog.flush();
      if (connection.options.type === 'postgres') {
        query = getRepository(User).createQueryBuilder('user')
          .select('COUNT(*)')
          .addSelect('"user"."userName"')
          .groupBy('"user"."userName"')
          .having('COUNT(*) > 1');
      } else {
        query = getRepository(User).createQueryBuilder('user')
          .select('COUNT(*)', 'count')
          .addSelect('user.userName')
          .groupBy('user.userName')
          .having('count > 1');
      }
      const viewers = await query.getRawMany();
      const clientBot = await client('bot');
      await Promise.all(viewers.map(async (duplicate) => {
        const userName = duplicate.user_username;
        const duplicates = await getRepository(User).find({ userName });
        await Promise.all(duplicates.map(async (user) => {
          try {
            const getUserById = await clientBot.users.getUserById(user.userId);
            if (!getUserById) {
              throw new Error('unknown');
            }
            if (getUserById.name !== userName) {
              changelog.update(user.userId, { userName: getUserById.name });
              debug('users', `Duplicate username ${user.userName}#${user.userId} changed to ${getUserById.name}#${user.userId}`);
            }
          } catch (e: any) {
            // we are tagging user as __AnonymousUser__, we don't want to get rid of all information
            debug('users', `Duplicate username ${user.userName}#${user.userId} not found on Twitch => __AnonymousUser__#${user.userId}`);
            changelog.update(user.userId, { userName: '__AnonymousUser__' });
          }
        }));
      }));
    } catch(e) {
      if (e instanceof Error) {
        if (e.message !== 'Cannot initialize Twitch API, bot token invalid.') {
          error(e.stack ?? e.message);
        }
      }
    } finally {
      setTimeout(() => this.checkDuplicateUsernames(), HOUR);
    }
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
        await getRepository(User).update({}, { isOnline: false });
      } else {
        // get new users
        await changelog.flush();
        const newChatters = await getRepository(User).find({ isOnline: true, watchedTime: 0 });
        debug('tmi.watched', `Adding ${newChatters.length} users as new chatters.`);
        stats.value.newChatters = stats.value.newChatters + newChatters.length;

        if (isStreamOnline.value) {
          debug('tmi.watched', `Incrementing watchedTime by ${interval}`);
          await changelog.flush();
          const incrementedUsers = await getRepository(User).increment({ isOnline: true }, 'watchedTime', interval);
          // chatTimeOnline + chatTimeOffline is solely use for points distribution
          debug('tmi.watched', `Incrementing chatTimeOnline by ${interval}`);
          await changelog.flush();
          await getRepository(User).increment({ isOnline: true }, 'chatTimeOnline', interval);

          if (typeof incrementedUsers.affected === 'undefined') {
            await changelog.flush();
            const users = await getRepository(User).find({ isOnline: true });
            if (isDebugEnabled('tmi.watched')) {
              for (const user of users) {
                debug('tmi.watched', `User ${user.userName}#${user.userId} added watched time ${interval}`);
              }
            }
            stats.value.currentWatchedTime = stats.value.currentWatchedTime + users.length * interval;
          } else {
            stats.value.currentWatchedTime = stats.value.currentWatchedTime + incrementedUsers.affected * interval;
          }

          recacheOnlineUsersPermission();
        } else {
          debug('tmi.watched', `Incrementing chatTimeOffline users by ${interval}`);
          await changelog.flush();
          await getRepository(User).increment({ isOnline: true }, 'chatTimeOffline', interval);
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

  async getNameById (userId: string): Promise<string> {
    const user = await await changelog.get(userId);
    if (!user) {
      const clientBot = await client('bot');
      const getUserById = await clientBot.users.getUserById(userId);
      if (getUserById) {
        changelog.update(userId, { userName: getUserById.name });
        return getUserById.name;
      } else {
        throw new Error('Cannot get username for userId ' + userId);
      }
    }
    return user.userName;
  }

  async getIdByName (userName: string) {
    if (userName.startsWith('@')) {
      userName = userName.substring(1);
    }
    await changelog.flush();
    const user = await getRepository(User).findOne({ where: { userName }, select: ['userId'] });
    if (!user) {
      const userId = await getIdFromTwitch(userName);
      changelog.update(userId, { userName });
      return userId;
    }
    return user.userId;
  }

  async getUserByUsername(userName: string, select?: FindOneOptions<Readonly<Required<UserInterface>>>['select']) {
    await changelog.flush();
    const userByUsername = await getRepository(User).findOne({ where: { userName }, select });

    if (userByUsername) {
      return userByUsername;
    }

    const userId = await this.getIdByName(userName);
    await changelog.flush();
    const userById = await changelog.get(userId);

    return userById as Readonly<Required<UserInterface>>;
  }

  sockets () {
    adminEndpoint('/core/users', 'viewers::resetPointsAll', async (cb) => {
      await changelog.flush();
      await getRepository(User).update({}, { points: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/core/users', 'viewers::resetMessagesAll', async (cb) => {
      await changelog.flush();
      await getRepository(User).update({}, { messages: 0, pointsByMessageGivenAt: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/core/users', 'viewers::resetWatchedTimeAll', async (cb) => {
      await changelog.flush();
      await getRepository(User).update({}, { watchedTime: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/core/users', 'viewers::resetSubgiftsAll', async (cb) => {
      await changelog.flush();
      await getRepository(User).update({}, { giftedSubscribes: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/core/users', 'viewers::resetBitsAll', async (cb) => {
      await getRepository(UserBit).clear();
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/core/users', 'viewers::resetTipsAll', async (cb) => {
      await getRepository(UserTip).clear();
      if (cb) {
        cb(null);
      }
    });

    adminEndpoint('/core/users', 'viewers::update', async ([userId, update], cb) => {
      try {
        if (typeof update.tips !== 'undefined') {
          for (const tip of update.tips) {
            if (typeof tip.exchangeRates === 'undefined') {
              tip.exchangeRates = rates;
            }
            tip.sortAmount = exchange(Number(tip.amount), tip.currency, 'EUR');
            if (typeof tip.id === 'string') {
              delete tip.id; // remove tip id as it is string (we are expecting number -> autoincrement)
            }
            await getRepository(UserTip).save({ ...tip, userId });
          }
          cb(null);
          return;
        }

        if (typeof update.bits !== 'undefined') {
          for (const bit of update.bits) {
            if (typeof bit.id === 'string') {
              delete bit.id; // remove bit id as it is string (we are expecting number -> autoincrement)
            }
            await getRepository(UserBit).save({ ...bit, userId });
          }
          cb(null);
          return;
        }

        if (typeof update.messages !== 'undefined') {
          update.pointsByMessageGivenAt = update.messages;
        }

        changelog.update(userId, update);
        // as cascade remove set ID as null, we need to get rid of tips/bits
        await getRepository(UserTip).delete({ userId: IsNull() });
        await getRepository(UserBit).delete({ userId: IsNull() });
        cb(null);
      } catch (e: any) {
        cb(e.stack);
      }
    });
    adminEndpoint('/core/users', 'viewers::remove', async (userId, cb) => {
      try {
        await changelog.flush();
        await getRepository(UserTip).delete({ userId });
        await getRepository(UserBit).delete({ userId });
        await getRepository(User).delete({ userId });
        cb(null);
      } catch (e: any) {
        error(e);
        cb(e.stack);
      }
    });
    adminEndpoint('/core/users', 'getNameById', async (id, cb) => {
      try {
        cb(null, await this.getNameById(id));
      } catch (e: any) {
        cb(e.stack, null);
      }
    });
    adminEndpoint('/core/users', 'find.viewers', async (opts, cb) => {
      try {
        const connection = await getConnection();
        opts.page = opts.page ?? 0;
        opts.perPage = opts.perPage ?? 25;
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
        if (connection.options.type === 'postgres') {
          query = getRepository(User).createQueryBuilder('user')
            .orderBy(opts.order?.orderBy ?? 'user.userName' , opts.order?.sortOrder ?? 'ASC')
            .select('COALESCE("sumTips", 0)', 'sumTips')
            .addSelect('COALESCE("sumBits", 0)', 'sumBits')
            .addSelect('"user".*')
            .offset(opts.page * opts.perPage)
            .limit(opts.perPage)
            .leftJoin('(select "userId", sum("amount") as "sumBits" from "user_bit" group by "userId")', 'user_bit', '"user_bit"."userId" = "user"."userId"')
            .leftJoin('(select "userId", sum("sortAmount") as "sumTips" from "user_tip" group by "userId")', 'user_tip', '"user_tip"."userId" = "user"."userId"');
        } else {
          query = getRepository(User).createQueryBuilder('user')
            .orderBy(opts.order?.orderBy ?? 'user.userName' , opts.order?.sortOrder ?? 'ASC')
            .select('JSON_EXTRACT(`user`.`extra`, \'$.levels.xp\')', 'levelXP')
            .addSelect('COALESCE(sumTips, 0)', 'sumTips')
            .addSelect('COALESCE(sumBits, 0)', 'sumBits')
            .addSelect('user.*')
            .offset(opts.page * opts.perPage)
            .limit(opts.perPage)
            .leftJoin('(select userId, sum(amount) as sumBits from user_bit group by userId)', 'user_bit', 'user_bit.userId = user.userId')
            .leftJoin('(select userId, sum(sortAmount) as sumTips from user_tip group by userId)', 'user_tip', 'user_tip.userId = user.userId');
        }

        if (typeof opts.order !== 'undefined') {
          if (opts.order.orderBy === 'level') {
            if (connection.options.type === 'better-sqlite3') {
              query.orderBy('LENGTH("levelXP")', opts.order.sortOrder);
              query.addOrderBy('"levelXP"', opts.order.sortOrder);
            } else if (connection.options.type === 'postgres') {
              query.orderBy('length(COALESCE(JSON_EXTRACT_PATH("extra"::json, \'levels\'), \'{}\')::text)', opts.order.sortOrder);
              query.addOrderBy('COALESCE(JSON_EXTRACT_PATH("extra"::json, \'levels\'), \'{}\')::text', opts.order.sortOrder);
            } else {
              query.orderBy('LENGTH(`levelXP`)', opts.order.sortOrder);
              query.addOrderBy('`levelXP`', opts.order.sortOrder);
            }
          } else if (connection.options.type === 'postgres') {
            opts.order.orderBy = opts.order.orderBy.split('.').map(o => `"${o}"`).join('.');
            query.orderBy(opts.order.orderBy, opts.order.sortOrder);

          } else {
            query.orderBy({ [opts.order.orderBy]: opts.order.sortOrder });
          }
        }

        if (typeof opts.filter !== 'undefined') {
          for (const filter of opts.filter) {
            query.andWhere(new Brackets(w => {
              if (connection.options.type === 'postgres') {
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

        const levels = require('~/systems/levels').default;
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

        cb(null, viewers, count, opts.state);
      } catch (e: any) {
        cb(e.stack, [], 0, null);
      }
    });
    viewerEndpoint('/core/users', 'viewers::findOne', async (userId, cb) => {
      try {
        const viewer = await changelog.get(userId);
        const tips =  await getRepository(UserTip).find({ where: { userId } });
        const bits =  await getRepository(UserBit).find({ where: { userId } });

        if (viewer) {
          const aggregatedTips = tips.map((o) => exchange(o.amount, o.currency, mainCurrency.value)).reduce((a, b) => a + b, 0);
          const aggregatedBits = bits.map((o) => Number(o.amount)).reduce((a, b) => a + b, 0);

          const permId = await getUserHighestPermission(userId);
          const permissionGroup = (await getRepository(Permissions).findOneOrFail({ where: { id: permId || defaultPermissions.VIEWERS } }));
          cb(null, {
            ...viewer, aggregatedBits, aggregatedTips, permission: permissionGroup, tips, bits,
          });
        } else {
          cb(null);
        }
      } catch (e: any) {
        cb(e.stack);
      }
    });
  }
}

export default new Users();
