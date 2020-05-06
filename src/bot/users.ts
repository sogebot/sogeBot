import Core from './_interface';

import { isMainThread } from './cluster';
import axios from 'axios';
import { isNil } from 'lodash';
import { setTimeout } from 'timers';

import { permission } from './helpers/permissions';
import { error } from './helpers/log';
import { adminEndpoint, viewerEndpoint } from './helpers/socket';
import { Brackets, getConnection, getRepository, IsNull } from 'typeorm';
import { User, UserBit, UserInterface, UserTip } from './database/entity/user';
import permissions from './permissions';
import oauth from './oauth';
import api from './api';
import currency from './currency';

class Users extends Core {
  uiSortCache: string | null = null;
  uiSortCacheViewers: Array<any> = [];

  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'viewers', id: 'manage/viewers/list' });

    if (isMainThread) {
      setTimeout(() => {
        this.updateWatchTime(true);
      }, 30000);
    }
  }

  async getChatOf (id: number, online: boolean): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id }});
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

    if (isInit) {
      // set all users offline on start
      await getRepository(User).update({}, { isOnline: false });
    } else {

      // get new users
      const newChatters = await getRepository(User).find({ isOnline: true, watchedTime: 0 });
      api.stats.newChatters += newChatters.length;

      if (api.isStreamOnline) {
        const incrementedUsers = await getRepository(User).increment({ isOnline: true }, 'watchedTime', interval);
        // chatTimeOnline + chatTimeOffline is solely use for points distribution
        await getRepository(User).increment({ isOnline: true }, 'chatTimeOnline', interval);

        if (typeof incrementedUsers.affected === 'undefined') {
          const users = await getRepository(User).find({ isOnline: true });
          api.stats.currentWatchedTime += users.length * interval;
        } else {
          api.stats.currentWatchedTime += incrementedUsers.affected * interval;
        }
      } else {
        await getRepository(User).increment({ isOnline: true }, 'chatTimeOffline', interval);
      }
    }

    setTimeout(() => this.updateWatchTime(), interval);
  }

  async getWatchedOf (id: number): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id }});

    if (user) {
      return Number(user.watchedTime) <= Number.MAX_SAFE_INTEGER
        ? user.watchedTime
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getMessagesOf (id: number): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id }});

    if (user) {
      return Number(user.messages) <= Number.MAX_SAFE_INTEGER
        ? user.messages
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getUsernamesFromIds (IdsList: Array<number>) {
    const IdsToUsername = {};
    for (const id of IdsList) {
      if (!isNil(IdsToUsername[id])) {
        continue;
      } // skip if already had map
      const user = await getRepository(User).findOne({ userId: id });
      if (user) {
        IdsToUsername[id] = user.username;
      }
    }
    return IdsToUsername;
  }

  async getNameById (userId: number) {
    const user = await getRepository(User).findOne({ userId });
    if (!user) {
      const savedUser = await getRepository(User).save({
        userId,
        username: await api.getUsernameFromTwitch(userId),
      });
      return savedUser.username;
    }
    return user.username;
  }

  async getIdByName (username: string) {
    const user = await getRepository(User).findOne({ username });
    if (!user) {
      const savedUser = await getRepository(User).save({
        userId: Number(await api.getIdFromTwitch(username)),
        username,
      });
      return savedUser.userId;
    }
    return user.userId;
  }

  async getUserByUsername(username: string) {
    const userByUsername = await getRepository(User).findOne({ where: { username }});

    if (userByUsername) {
      return userByUsername;
    }

    const userId = await this.getIdByName(username);
    const userById = await getRepository(User).findOne({ where: { userId }});

    return userById || await getRepository(User).save({
      userId,
      username,
    });
  }

  sockets () {
    adminEndpoint(this.nsp, 'viewers::resetPointsAll', async (cb) => {
      await getRepository(User).update({}, { points: 0 });
      cb();
    });
    adminEndpoint(this.nsp, 'viewers::resetMessagesAll', async (cb) => {
      await getRepository(User).update({}, { messages: 0, pointsByMessageGivenAt: 0 });
      cb();
    });
    adminEndpoint(this.nsp, 'viewers::resetWatchedTimeAll', async (cb) => {
      await getRepository(User).update({}, { watchedTime: 0 });
      cb();
    });
    adminEndpoint(this.nsp, 'viewers::resetBitsAll', async (cb) => {
      await getRepository(UserBit).clear();
      cb();
    });
    adminEndpoint(this.nsp, 'viewers::resetTipsAll', async (cb) => {
      await getRepository(UserTip).clear();
      cb();
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
        await getRepository(User).remove(viewer);
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
    adminEndpoint(this.nsp, 'find.viewers', async (opts: { state?: any; search?: string; filter?: { subscribers: null | boolean; followers: null | boolean; active: null | boolean; vips: null | boolean }; page: number; order?: { orderBy: string; sortOrder: 'ASC' | 'DESC' } }, cb) => {
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
        const count = await query.getCount();

        cb(null, viewers, count, opts.state);
      } catch (e) {
        cb(e.stack, [], null, null);
      }
    });
    adminEndpoint(this.nsp, 'viewers::followedAt', async (id, cb) => {
      try {
        const cid = oauth.channelId;
        const url = `https://api.twitch.tv/helix/users/follows?from_id=${id}&to_id=${cid}`;

        const token = oauth.botAccessToken;
        if (token === '') {
          cb(new Error('no token available'), null);
        }

        const request = await axios.get(url, {
          headers: {
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Authorization': 'Bearer ' + token,
            'Client-ID': oauth.botClientId,
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
        const viewer = await getRepository(User).findOne({
          where: { userId },
        });

        if (viewer) {
          const aggregatedTips = viewer.tips.map((o) => currency.exchange(o.amount, o.currency, currency.mainCurrency)).reduce((a, b) => a + b, 0);
          const aggregatedBits = viewer.bits.map((o) => Number(o.amount)).reduce((a, b) => a + b, 0);

          const permId = await permissions.getUserHighestPermission(userId);
          let permissionGroup;
          if (permId) {
            permissionGroup = await permissions.get(permId);
          } else {
            permissionGroup = permission.VIEWERS;
          }

          cb(null, {...viewer, aggregatedBits, aggregatedTips, permission: permissionGroup});
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
