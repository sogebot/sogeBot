import { isMainThread } from './cluster';
import axios from 'axios';
import { isNil } from 'lodash';
import { setTimeout } from 'timers';

import * as constants from './constants';
import Core from './_interface';
import * as commons from './commons';
import { permission } from './helpers/permissions';
import { debug, error, isDebugEnabled } from './helpers/log';
import { adminEndpoint, viewerEndpoint } from './helpers/socket';
import { Brackets, getConnection, getRepository } from 'typeorm';
import { User, UserBit, UserTip } from './entity/user';
import { getAllOnlineUsernames } from './helpers/getAllOnlineUsernames';

class Users extends Core {
  uiSortCache: string | null = null;
  uiSortCacheViewers: Array<any> = [];
  newChattersList: Array<string> = [];
  chatList: { [x: string]: number } = {};
  watchedList: { [x: string]: number } = {};

  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'viewers', id: 'manage/viewers/list' });

    if (isMainThread) {
      setTimeout(() => {
        this.updateWatchTime(true);
        this.updateChatTime();
      }, 30000);
    }
  }

  async checkNewChatter (id: number, username: string) {
    const watched = await this.getWatchedOf(id);
    // add user as a new chatter in a stream
    if (watched === 0 && !this.newChattersList.includes(username)) {
      global.api.stats.newChatters += 1;
      this.newChattersList.push(username.toLowerCase());
    }
  }

  async updateChatTime () {
    if (isDebugEnabled('users.chat')) {
      const message = 'chat time update ' + new Date();
      debug('users.chat', Array(message.length + 1).join('='));
      debug('users.chat', message);
      debug('users.chat', Array(message.length + 1).join('='));
    }

    clearTimeout(this.timeouts.updateChatTime);
    let timeout = constants.MINUTE;
    try {
      const users = await getAllOnlineUsernames();
      if (users.length === 0) {
        throw Error('No online users.');
      }
      const updated: any[] = [];
      for (const username of users) {
        const isIgnored = commons.isIgnored({username});
        const isBot = commons.isBot(username);
        const isNewUser = typeof this.chatList[username] === 'undefined';

        if (isIgnored || isBot) {
          continue;
        }

        const chat = isNewUser ? 0 : Date.now() - this.chatList[username];
        const id = await global.users.getIdByName(username);
        if (!id) {
          debug('users.chat', 'error: cannot get id of ' + username);
          continue;
        }

        if (isNewUser) {
          this.checkNewChatter(id, username);
        }

        const online = global.api.isStreamOnline;
        if (online) {
          await getRepository(User).increment({ userId: id }, 'chatTimeOnline', chat);
        } else {
          await getRepository(User).increment({ userId: id }, 'chatTimeOffline', chat);
        }
        debug('users.chat', username + ': ' + (chat / 1000 / 60) + ' minutes added');
        updated.push(username);
        this.chatList[username] = Date.now();
      }

      // remove offline users from chat list
      for (const u of Object.entries(this.chatList)) {
        if (!updated.includes(u[0])) {
          debug('users.chat', u[0] + ': removed from online list');
          delete this.chatList[u[0]];
        }
      }
    } catch (e) {
      debug('users.chat', e.message);
      this.chatList = {};
      global.users.newChattersList = [];
      timeout = 1000;
    }
    this.timeouts.updateChatTime = setTimeout(() => this.updateChatTime(), timeout);
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
    if (isInit) {
      // set all users offline on start
      await getRepository(User).update({}, { isOnline: false });
    }

    if (isDebugEnabled('users.watched')) {
      const message = 'Watched time update ' + new Date();
      debug('users.watched', Array(message.length + 1).join('='));
      debug('users.watched', message);
      debug('users.watched', Array(message.length + 1).join('='));
    }

    clearTimeout(this.timeouts.updateWatchTime);
    let timeout = constants.MINUTE * 5;
    try {
      // count watching time when stream is online
      if (global.api.isStreamOnline) {
        const users = await getAllOnlineUsernames();
        if (users.length === 0) {
          throw Error('No online users.');
        }
        const updated: string[] = [];
        for (const username of users) {
          const isIgnored = commons.isIgnored({username});
          const isBot = commons.isBot(username);
          const isOwner = commons.isOwner(username);
          const isNewUser = typeof this.watchedList[username] === 'undefined';

          if (isIgnored || isBot) {
            continue;
          }

          const watched = isNewUser ? 0 : Date.now() - this.watchedList[username];
          const id = await global.users.getIdByName(username);
          if (!id) {
            debug('users.watched', 'error: cannot get id of ' + username);
            continue;
          }

          if (isNewUser) {
            this.checkNewChatter(id, username);
          }
          if (!isOwner) {
            global.api.stats.currentWatchedTime += watched;
          }
          await getRepository(User).increment({ userId: id }, 'watchedTime', watched);
          debug('users.watched', username + ': ' + (watched / 1000 / 60) + ' minutes added');
          updated.push(username);
          this.watchedList[username] = Date.now();
        }

        // remove offline users from watched list
        for (const u of Object.entries(this.watchedList)) {
          if (!updated.includes(u[0])) {
            debug('users.watched', u[0] + ': removed from online list');
            delete this.watchedList[u[0]];
          }
        }
      } else {
        throw Error('Stream offline, watch time is not counting, retrying');
      }
    } catch (e) {
      debug('users.watched', e.message);
      this.watchedList = {};
      global.users.newChattersList = [];
      timeout = 1000;
    }
    this.timeouts.updateWatchTime = setTimeout(() => this.updateWatchTime(), timeout);
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
    let user = await getRepository(User).findOne({ userId });
    if (!user) {
      user = new User();
      user.userId = userId;
      user.username = await global.api.getUsernameFromTwitch(userId);
      await getRepository(User).save(user);
    }
    return user.username;
  }

  async getIdByName (username: string) {
    let user = await getRepository(User).findOne({ username });
    if (!user) {
      user = new User();
      user.userId = Number(await global.api.getIdFromTwitch(username));
      user.username = username;
      await getRepository(User).save(user);
    }
    return user.userId;
  }

  sockets () {
    adminEndpoint(this.nsp, 'viewers::resetPointsAll', async (cb) => {
      await getRepository(User).update({}, { points: 0 });
      cb();
    });
    adminEndpoint(this.nsp, 'viewers::resetMessagesAll', async (cb) => {
      await getRepository(User).update({}, { messages: 0 });
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
    adminEndpoint(this.nsp, 'viewers::save', async (viewer: User, cb) => {
      try {
        // recount sortAmount
        for (const tip of viewer.tips) {
          tip.sortAmount = global.currency.exchange(Number(tip.amount), tip.currency, 'EUR');
        }
        await getRepository(User).save(viewer);
        cb();
      } catch (e) {
        error(e);
        cb(e);
      }
    });
    adminEndpoint(this.nsp, 'viewers::remove', async (viewer: User, cb) => {
      try {
        await getRepository(User).remove(viewer);
      } catch (e) {
        error(e);
        cb(e);
      }
    });
    adminEndpoint(this.nsp, 'getNameById', async (id, cb) => {
      cb(await this.getNameById(id));
    });
    adminEndpoint(this.nsp, 'find.viewers', async (opts: { search?: string; filter?: { subscribers: null | boolean; followers: null | boolean; active: null | boolean; vips: null | boolean }; page: number; order?: { orderBy: string; sortOrder: 'ASC' | 'DESC' } }, cb) => {
      const connection = await getConnection();
      opts.page = opts.page ?? 0;

      let query;
      if (connection.options.type === 'postgres') {
        query = getRepository(User).createQueryBuilder('user')
          .orderBy(opts.order?.orderBy ?? 'user.username' , opts.order?.sortOrder ?? 'ASC')
          .select('COALESCE(SUM("user_bit"."amount"), 0)', 'sumBits')
          .addSelect('COALESCE(SUM("user_tip"."sortAmount"), 0)', 'sumTips')
          .addSelect('"user".*')
          .offset(opts.page * 25)
          .limit(25)
          .leftJoin(UserBit, 'user_bit', '"user_bit"."userUserId" = "user"."userId"')
          .leftJoin(UserTip, 'user_tip', '"user_tip"."userUserId" = "user"."userId"')
          .groupBy('user.userId');
      } else {
        query = getRepository(User).createQueryBuilder('user')
          .orderBy(opts.order?.orderBy ?? 'user.username' , opts.order?.sortOrder ?? 'ASC')
          .select('COALESCE(SUM(user_bit.amount), 0)', 'sumBits')
          .addSelect('COALESCE(SUM(user_tip.sortAmount), 0)', 'sumTips')
          .addSelect('user.*')
          .offset(opts.page * 25)
          .limit(25)
          .leftJoin(UserBit, 'user_bit', 'user_bit.userUserId = user.userId')
          .leftJoin(UserTip, 'user_tip', 'user_tip.userUserId = user.userId')
          .groupBy('user.userId');
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
          w.where('"user"."username" like :like', { like: `%${opts.search}%` });
          w.orWhere('CAST("user"."userId" AS TEXT) like :like', { like: `%${opts.search}%` });
        }));
      }

      const viewers = await query.getRawMany();
      const count = await query.getCount();

      for (const viewer of viewers) {
        // recount sumTips to bot currency
        viewer.sumTips = await global.currency.exchange(viewer.sumTips, 'EUR', global.currency.mainCurrency);
      }

      cb(viewers, count);
    });
    adminEndpoint(this.nsp, 'viewers::followedAt', async (id, cb) => {
      try {
        const cid = global.oauth.channelId;
        const url = `https://api.twitch.tv/helix/users/follows?from_id=${id}&to_id=${cid}`;

        const token = global.oauth.botAccessToken;
        if (token === '') {
          cb(new Error('no token available'), null);
        }

        const request = await axios.get(url, {
          headers: {
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Authorization': 'Bearer ' + token,
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
      const viewer = await getRepository(User).findOne({
        relations: ['tips', 'bits'],
        where: { userId },
      });

      if (viewer) {
        const aggregatedTips = viewer.tips.map((o) => global.currency.exchange(o.amount, o.currency, global.currency.mainCurrency)).reduce((a, b) => a + b, 0);
        const aggregatedBits = viewer.bits.map((o) => Number(o.amount)).reduce((a, b) => a + b, 0);

        const permId = await global.permissions.getUserHighestPermission(userId);
        let permissionGroup;
        if (permId) {
          permissionGroup = await global.permissions.get(permId);
        } else {
          permissionGroup = permission.VIEWERS;
        }

        cb({...viewer, aggregatedBits, aggregatedTips, permission: permissionGroup});
      } else {
        cb();
      }
    });
    adminEndpoint(this.nsp, 'delete.viewer', async (userId, cb) => {
      const viewer = await getRepository(User).findOne({ userId });
      if (viewer) {
        await getRepository(User).remove(viewer);
      }
      cb(null);
    });
    adminEndpoint(this.nsp, 'update.viewer', async (opts, cb) => {
      cb(null);
    });
  }
}

export default Users;
export { Users };
