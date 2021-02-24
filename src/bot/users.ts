import { setTimeout } from 'timers';

import axios from 'axios';
import {
  Brackets, FindOneOptions, getConnection, getRepository, IsNull,
} from 'typeorm';

import Core from './_interface';
import api from './api';
import { HOUR } from './constants';
import currency from './currency';
import { Permissions } from './database/entity/permissions';
import {
  User, UserBit, UserInterface, UserTip,
} from './database/entity/user';
import { onStartup } from './decorators/on';
import { isStreamOnline, stats } from './helpers/api';
import { mainCurrency } from './helpers/currency';
import {
  debug, error, isDebugEnabled,
} from './helpers/log';
import { channelId } from './helpers/oauth';
import { recacheOnlineUsersPermission } from './helpers/permissions';
import { defaultPermissions, getUserHighestPermission } from './helpers/permissions/';
import { adminEndpoint, viewerEndpoint } from './helpers/socket';
import { getIdFromTwitch } from './microservices/getIdFromTwitch';
import oauth from './oauth';

class Users extends Core {
  constructor () {
    super();
    this.addMenu({
      category: 'manage', name: 'viewers', id: 'manage/viewers/list', this: null,
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
      if (connection.options.type === 'postgres') {
        query = getRepository(User).createQueryBuilder('user')
          .select('COUNT(*)', 'count')
          .addSelect('"user"."username"')
          .groupBy('"user"."username"')
          .having('"count" > 1');
      } else {
        query = getRepository(User).createQueryBuilder('user')
          .select('COUNT(*)', 'count')
          .addSelect('user.username')
          .groupBy('user.username')
          .having('count > 1');
      }
      const viewers = await query.getRawMany();
      await Promise.all(viewers.map(async (duplicate) => {
        const username = duplicate.user_username;
        const duplicates = await getRepository(User).find({ username });
        await Promise.all(duplicates.map(async (user) => {
          try {
            const newUsername = await api.getUsernameFromTwitch(user.userId);
            if (newUsername === null) {
              throw new Error('unknown');
            }
            if (newUsername !== username) {
              await getRepository(User).update({ userId: user.userId }, { username: newUsername });
              debug('users', `Duplicate username ${user.username}#${user.userId} changed to ${newUsername}#${user.userId}`);
            }
          } catch (e) {
            // we are tagging user as __AnonymousUser__, we don't want to get rid of all information
            debug('users', `Duplicate username ${user.username}#${user.userId} not found on Twitch => __AnonymousUser__#${user.userId}`);
            await getRepository(User).update({ userId: user.userId }, { username: '__AnonymousUser__' });
          }
        }));
      }));
    } catch(e) {
      error(e);
    } finally {
      setTimeout(() => this.checkDuplicateUsernames(), HOUR);
    }
  }

  async getChatOf (id: number, online: boolean): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id } });
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
        await getRepository(User).update({}, { isOnline: false });
      } else {
        // get new users
        const newChatters = await getRepository(User).find({ isOnline: true, watchedTime: 0 });
        debug('tmi.watched', `Adding ${newChatters.length} users as new chatters.`);
        stats.value.newChatters = stats.value.newChatters + newChatters.length;

        if (isStreamOnline.value) {
          debug('tmi.watched', `Incrementing watchedTime by ${interval}`);
          const incrementedUsers = await getRepository(User).increment({ isOnline: true }, 'watchedTime', interval);
          // chatTimeOnline + chatTimeOffline is solely use for points distribution
          debug('tmi.watched', `Incrementing chatTimeOnline by ${interval}`);
          await getRepository(User).increment({ isOnline: true }, 'chatTimeOnline', interval);

          if (typeof incrementedUsers.affected === 'undefined') {
            const users = await getRepository(User).find({ isOnline: true });
            if (isDebugEnabled('tmi.watched')) {
              for (const user of users) {
                debug('tmi.watched', `User ${user.username}#${user.userId} added watched time ${interval}`);
              }
            }
            stats.value.currentWatchedTime = stats.value.currentWatchedTime + users.length * interval;
          } else {
            stats.value.currentWatchedTime = stats.value.currentWatchedTime + incrementedUsers.affected * interval;
          }

          recacheOnlineUsersPermission();
        } else {
          debug('tmi.watched', `Incrementing chatTimeOffline users by ${interval}`);
          await getRepository(User).increment({ isOnline: true }, 'chatTimeOffline', interval);
        }
      }
    } catch (e) {
      error(e.stack);
    } finally {
      setTimeout(() => this.updateWatchTime(), interval);
    }
  }

  async getWatchedOf (id: number): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id } });

    if (user) {
      return Number(user.watchedTime) <= Number.MAX_SAFE_INTEGER
        ? user.watchedTime
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getMessagesOf (id: number): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id } });

    if (user) {
      return Number(user.messages) <= Number.MAX_SAFE_INTEGER
        ? user.messages
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getUsernamesFromIds (IdsList: number[]): Promise<{ id: number; username: string }[]> {
    const uniqueWithUsername = await Promise.all(
      [...new Set(IdsList)]
        .map(async (id) => {
          const user = await getRepository(User).findOne({ userId: id });
          if (user) {
            return { id: id, username: user.username };
          }
          return null;
        }),
    );
    return uniqueWithUsername.reduce(async (prev: any, cur) => {
      const value = await cur;
      if (value) {
        return { ...prev, [value.id]: value.username };
      } else {
        return prev;
      }
    }, {});
  }

  async getNameById (userId: number | string): Promise<string> {
    userId = Number(userId);
    const user = await getRepository(User).findOne({ userId });
    if (!user) {
      const username = await api.getUsernameFromTwitch(userId);
      if (username) {
        const savedUser = await getRepository(User).save({
          userId,
          username,
        });
        return savedUser.username;
      } else {
        throw new Error('Cannot get username for userId ' + userId);
      }
    }
    return user.username;
  }

  async getIdByName (username: string) {
    if (username.startsWith('@')) {
      username = username.substring(1);
    }
    const user = await getRepository(User).findOne({ where: { username }, select: ['userId'] });
    if (!user) {
      const savedUser = await getRepository(User).save({
        userId: Number(await getIdFromTwitch(username)),
        username,
      });
      return savedUser.userId;
    }
    return user.userId;
  }

  async getUserByUsername(username: string, select?: FindOneOptions<Readonly<Required<UserInterface>>>['select']) {
    const userByUsername = await getRepository(User).findOne({ where: { username }, select });

    if (userByUsername) {
      return userByUsername;
    }

    const userId = await this.getIdByName(username);
    const userById = await getRepository(User).findOne({ where: { userId } });

    return userById || await getRepository(User).save({
      userId,
      username,
    });
  }

  sockets () {
    viewerEndpoint(this.nsp, 'theme::set', async (data) => {
      try {
        const user = await getRepository(User).findOneOrFail({ userId: Number(data.userId) });
        const payload = {
          extra: {
            ...user.extra,
            theme: data.theme,
          },
        };
        await getRepository(User).update({ userId: Number(data.userId) }, payload);
      } catch (e) {
        if (e.name !== 'EntityNotFound') {
          error(e.stack);
        }
      }
    });
    viewerEndpoint(this.nsp, 'theme::get', async (data, cb) => {
      try {
        const user = await getRepository(User).findOneOrFail({ userId: Number(data.userId) });
        cb(null, user.extra?.theme ?? null);
      } catch (e) {
        cb(e.stack, null);
      }
    });

    adminEndpoint(this.nsp, 'viewers::resetPointsAll', async (cb) => {
      await getRepository(User).update({}, { points: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::resetMessagesAll', async (cb) => {
      await getRepository(User).update({}, { messages: 0, pointsByMessageGivenAt: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::resetWatchedTimeAll', async (cb) => {
      await getRepository(User).update({}, { watchedTime: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::resetSubgiftsAll', async (cb) => {
      await getRepository(User).update({}, { giftedSubscribes: 0 });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::resetBitsAll', async (cb) => {
      await getRepository(UserBit).clear();
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::resetTipsAll', async (cb) => {
      await getRepository(UserTip).clear();
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::save', async (viewer: Required<UserInterface>, cb) => {
      try {
        // recount sortAmount and add exchangeRates if needed
        for (const tip of viewer.tips) {
          if (typeof tip.exchangeRates === 'undefined') {
            tip.exchangeRates = currency.rates;
          }
          tip.sortAmount = currency.exchange(Number(tip.amount), tip.currency, 'EUR');
        }

        if (viewer.messages < viewer.pointsByMessageGivenAt) {
          viewer.pointsByMessageGivenAt = viewer.messages;
        }

        const result = await getRepository(User).save(viewer);
        // as cascade remove set ID as null, we need to get rid of tips/bits
        await getRepository(UserTip).delete({ userId: IsNull() });
        await getRepository(UserBit).delete({ userId: IsNull() });
        cb(null, result);
      } catch (e) {
        error(e);
        cb(e.stack, viewer);
      }
    });
    adminEndpoint(this.nsp, 'viewers::remove', async (viewer: Required<UserInterface>, cb) => {
      try {
        cb(null, await getRepository(User).remove(viewer));
      } catch (e) {
        error(e);
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'getNameById', async (id, cb) => {
      try {
        cb(null, await this.getNameById(id));
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'find.viewers', async (opts, cb) => {
      try {
        const connection = await getConnection();
        opts.page = opts.page ?? 0;

        /*
          SQL query:
            select user.*, COALESCE(sumTips, 0) as sumTips, COALESCE(sumBits, 0) as sumBits
            from user
              left join (select userUserId, sum(sortAmount) as sumTips from user_tip group by userUserId) user_tip on user.userId = user_tip.userUserId
              left join (select userUserId, sum(amount) as sumBits from user_bit group by userUserId) user_bit on user.userId = user_bit.userUserId
        */
        let query;
        if (connection.options.type === 'postgres') {
          query = getRepository(User).createQueryBuilder('user')
            .orderBy(opts.order?.orderBy ?? 'user.username' , opts.order?.sortOrder ?? 'ASC')
            .select('COALESCE("sumTips", 0)', 'sumTips')
            .addSelect('COALESCE("sumBits", 0)', 'sumBits')
            .addSelect('"user".*')
            .offset(opts.page * 25)
            .limit(25)
            .leftJoin('(select "userUserId", sum("amount") as "sumBits" from "user_bit" group by "userUserId")', 'user_bit', '"user_bit"."userUserId" = "user"."userId"')
            .leftJoin('(select "userUserId", sum("sortAmount") as "sumTips" from "user_tip" group by "userUserId")', 'user_tip', '"user_tip"."userUserId" = "user"."userId"');
        } else {
          query = getRepository(User).createQueryBuilder('user')
            .orderBy(opts.order?.orderBy ?? 'user.username' , opts.order?.sortOrder ?? 'ASC')
            .select('COALESCE(sumTips, 0)', 'sumTips')
            .addSelect('COALESCE(sumBits, 0)', 'sumBits')
            .addSelect('user.*')
            .offset(opts.page * 25)
            .limit(25)
            .leftJoin('(select userUserId, sum(amount) as sumBits from user_bit group by userUserId)', 'user_bit', 'user_bit.userUserId = user.userId')
            .leftJoin('(select userUserId, sum(sortAmount) as sumTips from user_tip group by userUserId)', 'user_tip', 'user_tip.userUserId = user.userId');
        }

        if (typeof opts.order !== 'undefined') {
          if (connection.options.type === 'postgres') {
            opts.order.orderBy = opts.order.orderBy.split('.').map(o => `"${o}"`).join('.');
          }
          query.orderBy({ [opts.order.orderBy]: opts.order.sortOrder });
        }

        if (typeof opts.filter !== 'undefined') {
          if (opts.filter.subscribers !== null) {
            query.andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: opts.filter.subscribers });
          }
          if (opts.filter.followers !== null) {
            query.andWhere('user.isFollower = :isFollower', { isFollower: opts.filter.followers });
          }
          if (opts.filter.vips !== null) {
            query.andWhere('user.isVIP = :isVIP', { isVIP: opts.filter.vips });
          }
          if (opts.filter.active !== null) {
            query.andWhere('user.isOnline = :isOnline', { isOnline: opts.filter.active });
          }
        }

        if (typeof opts.search !== 'undefined') {
          query.andWhere(new Brackets(w => {
            if (connection.options.type === 'postgres') {
              w.where('"user"."username" like :like', { like: `%${opts.search}%` });
              w.orWhere('CAST("user"."userId" AS TEXT) like :like', { like: `%${opts.search}%` });
            } else {
              w.where('`user`.`username` like :like', { like: `%${opts.search}%` });
              w.orWhere('CAST(`user`.`userId` AS CHAR) like :like', { like: `%${opts.search}%` });
            }
          }));
        }

        const viewers = await query.getRawMany();
        let count = await query.getCount();

        if (opts.exactUsernameFromTwitch && opts.search) {
          // we need to check if viewers have already opts.search in list (we don't need to fetch twitch data)
          if (!viewers.find(o => o.username === opts.search)) {
            try {
              const userId = await getIdFromTwitch(opts.search);
              viewers.unshift({ userId, username: opts.search });
              count++;
            } catch (e) {
              // we don't care if user is not found
            }

          }
        }

        cb(null, viewers, count, opts.state);
      } catch (e) {
        cb(e.stack, [], null, null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::followedAt', async (id, cb) => {
      try {
        const cid = channelId.value;
        const url = `https://api.twitch.tv/helix/users/follows?from_id=${id}&to_id=${cid}`;

        const token = oauth.botAccessToken;
        if (token === '') {
          cb(new Error('no token available'), null);
        }

        const request = await axios.get(url, {
          headers: {
            'Accept':        'application/vnd.twitchtv.v5+json',
            'Authorization': 'Bearer ' + token,
            'Client-ID':     oauth.botClientId,
          },
        });
        if (request.data.total === 0) {
          throw new Error('Not a follower');
        } else {
          cb(null, new Date(request.data.data[0].followed_at).getTime());
        }
      } catch (e) {
        cb(e.stack, null);
      }
    });
    viewerEndpoint(this.nsp, 'viewers::findOne', async (userId, cb) => {
      try {
        const viewer = await getRepository(User).findOne({ where: { userId } });

        if (viewer) {
          const aggregatedTips = viewer.tips.map((o) => currency.exchange(o.amount, o.currency, mainCurrency.value)).reduce((a, b) => a + b, 0);
          const aggregatedBits = viewer.bits.map((o) => Number(o.amount)).reduce((a, b) => a + b, 0);

          const permId = await getUserHighestPermission(userId);
          const permissionGroup = (await getRepository(Permissions).findOneOrFail({ where: { id: permId || defaultPermissions.VIEWERS } }));
          cb(null, {
            ...viewer, aggregatedBits, aggregatedTips, permission: permissionGroup,
          });
        } else {
          cb(null);
        }
      } catch (e) {
        cb(e.stack);
      }
    });
  }
}

export default new Users();
