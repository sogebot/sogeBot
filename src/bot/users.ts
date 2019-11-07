import { isMainThread } from './cluster';
import axios from 'axios';
import { cloneDeep, defaults, filter, get, isNil, set } from 'lodash';
import { setTimeout } from 'timers';

import * as constants from './constants';
import Core from './_interface';
import * as commons from './commons';
import { debug, isDebugEnabled } from './helpers/log';
import { permission } from './helpers/permissions';
import { adminEndpoint, viewerEndpoint } from './helpers/socket';
import { getRepository } from 'typeorm';
import { User } from './entity/user';


export const getAllOnlineUsernames = async () => {
  return (await getRepository(User).find({ where: { isOnline: true }})).map(o => o.username);
};

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

  async checkNewChatter (id: string, username: string) {
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

  async getChatOf (id: string, online: boolean): Promise<number> {
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

  async getWatchedOf (id: string): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id }});

    if (user) {
      return Number(user.watchedTime) <= Number.MAX_SAFE_INTEGER
        ? user.watchedTime
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getMessagesOf (id: string): Promise<number> {
    const user = await getRepository(User).findOne({ where: { userId: id }});

    if (user) {
      return Number(user.messages) <= Number.MAX_SAFE_INTEGER
        ? user.messages
        : Number.MAX_SAFE_INTEGER;
    } else {
      return 0;
    }
  }

  async getUsernamesFromIds (IdsList: Array<string>) {
    const IdsToUsername = {};
    for (const id of IdsList) {
      if (!isNil(IdsToUsername[id])) {
        continue;
      } // skip if already had map
      IdsToUsername[id] = (await global.db.engine.findOne('users', { id })).username;
    }
    return IdsToUsername;
  }

  async getNameById (id: string) {
    let username = (await global.db.engine.findOne('users', { id })).username;

    if (typeof username === 'undefined' || username === null) {
      username = await global.api.getUsernameFromTwitch(id);
      if (username) {
        global.db.engine.update('users', { id }, { username });
      }
    }
    return username || null;
  }

  async getIdByName (username: string) {
    let user = await getRepository(User).findOne({ username });
    if (!user) {
      user = new User();
      user.userId = await global.api.getIdFromTwitch(username);
    }
    return user.userId;
  }

  sockets () {
    adminEndpoint(this.nsp, 'getNameById', async (id, cb) => {
      cb(await this.getNameById(id));
    });
    adminEndpoint(this.nsp, 'search', async(opts, cb) => {
      const regexp = new RegExp(opts.search, 'i');
      const usersById = await global.db.engine.find('users', { id: { $regex: regexp } });
      const usersByName = await global.db.engine.find('users', { username: { $regex: regexp } });
      cb({
        results: [
          ...usersById,
          ...usersByName,
        ],
        state: opts.state,
      });
    });
    adminEndpoint(this.nsp, 'find.viewers', async (opts, cb) => {
      opts = defaults(opts, { filter: null, show: { subscribers: null, followers: null, active: null, vips: null } });
      opts.page--; // we are counting index from 0

      let viewers = await global.db.engine.find('users', { }, [
        { from: 'users.tips', as: 'tips', foreignField: 'id', localField: 'id' },
        { from: 'users.bits', as: 'bits', foreignField: 'id', localField: 'id' },
        { from: 'users.points', as: 'points', foreignField: 'id', localField: 'id' },
        { from: 'users.messages', as: 'messages', foreignField: 'id', localField: 'id' },
        { from: 'users.online', as: 'online', foreignField: 'username', localField: 'username' },
        { from: 'users.watched', as: 'watched', foreignField: 'id', localField: 'id' },
      ]);

      for (const v of viewers) {
        set(v, 'stats.tips', v.tips.map((o) => global.currency.exchange(o.amount, o.currency, global.currency.mainCurrency)).reduce((a, b) => a + b, 0));
        set(v, 'stats.bits', v.bits.map((o) => Number(o.amount)).reduce((a, b) => a + b, 0));
        set(v, 'custom.currency', global.currency.mainCurrency);
        set(v, 'points', (v.points[0] || { points: 0 }).points);
        set(v, 'messages', (v.messages[0] || { messages: 0 }).messages);
        set(v, 'time.watched', (v.watched[0] || { watched: 0 }).watched);
      }

      // filter users
      if (!isNil(opts.filter)) {
        viewers = filter(viewers, (o) => o.username && o.username.toLowerCase().startsWith(opts.filter.toLowerCase().trim()));
      }
      if (!isNil(opts.show.subscribers)) {
        viewers = filter(viewers, (o) => get(o, 'is.subscriber', false) === opts.show.subscribers);
      }
      if (!isNil(opts.show.followers)) {
        viewers = filter(viewers, (o) => get(o, 'is.follower', false) === opts.show.followers);
      }
      if (!isNil(opts.show.vips)) {
        viewers = filter(viewers, (o) => get(o, 'is.vip', false) === opts.show.vips);
      }
      if (!isNil(opts.show.active)) {
        viewers = filter(viewers, (o) => o.online.length > 0);
      }
      cb(viewers);
    });
    adminEndpoint(this.nsp, 'followedAt.viewer', async (id, cb) => {
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
    viewerEndpoint(this.nsp, 'findOne.viewer', async (opts, cb) => {
      const [viewer, tips, bits, points, messages, watched, permId] = await Promise.all([
        global.db.engine.findOne('users', { id: opts.where.id }),
        global.db.engine.find('users.tips', { id: opts.where.id }),
        global.db.engine.find('users.bits', { id: opts.where.id }),
        global.systems.points.getPointsOf(opts.where.id),
        global.users.getMessagesOf(opts.where.id),
        global.users.getWatchedOf(opts.where.id),
        global.permissions.getUserHighestPermission(opts.where.id),
      ]);

      const online = await getRepository(User).findOne({
        where: { username: viewer.username, isOnline: true },
      });

      set(viewer, 'stats.tips', tips);
      set(viewer, 'stats.bits', bits);
      set(viewer, 'stats.aggregatedTips', tips.map((o) => global.currency.exchange(o.amount, o.currency, global.currency.mainCurrency)).reduce((a, b) => a + b, 0));
      set(viewer, 'stats.aggregatedBits', bits.map((o) => Number(o.amount)).reduce((a, b) => a + b, 0));
      set(viewer, 'custom.currency', global.currency.mainCurrency);
      set(viewer, 'stats.messages', messages);
      set(viewer, 'points', points);
      set(viewer, 'time.watched', watched);

      if (!viewer.lock) {
        viewer.lock = {
          follower: false,
          subscriber: false,
          followed_at: false,
          subscribed_at: false,
        };
      } else {
        if (typeof viewer.lock.follower === 'undefined' || viewer.lock.follower === null) {
          viewer.lock.follower = false;
        }
        if (typeof viewer.lock.subscriber === 'undefined' || viewer.lock.subscriber === null) {
          viewer.lock.subscriber = false;
        }
        if (typeof viewer.lock.followed_at === 'undefined' || viewer.lock.followed_at === null) {
          viewer.lock.followed_at = false;
        }
        if (typeof viewer.lock.subscribed_at === 'undefined' || viewer.lock.subscribed_at === null) {
          viewer.lock.subscribed_at = false;
        }
      }

      if (!viewer.is) {
        viewer.is = {
          follower: false,
          subscriber: false,
          vip: false,
        };
      } else {
        if (typeof viewer.is.follower === 'undefined' || viewer.is.follower === null) {
          viewer.is.follower = false;
        }
        if (typeof viewer.is.subscriber === 'undefined' || viewer.is.subscriber === null) {
          viewer.is.subscriber = false;
        }
        if (typeof viewer.is.vip === 'undefined' || viewer.is.vip === null) {
          viewer.is.vip = false;
        }
      }

      // PERMISSION
      if (permId) {
        viewer.permission = await global.permissions.get(permId);
      } else {
        viewer.permission = permission.VIEWERS;
      }

      // ONLINE
      const isOnline = typeof online !== 'undefined';
      set(viewer, 'is.online', isOnline);

      cb(null, viewer);
    });
    adminEndpoint(this.nsp, 'delete.viewer', async (opts, cb) => {
      const id = opts._id;
      await global.db.engine.remove('users.points', { id });
      await global.db.engine.remove('users.messages', { id });
      await global.db.engine.remove('users.watched', { id });
      await global.db.engine.remove('users.bits', { id });
      await global.db.engine.remove('users.tips', { id });
      await global.db.engine.remove('users', { id });
      cb(null);
    });
    adminEndpoint(this.nsp, 'update.viewer', async (opts, cb) => {
      const id = opts.items[0]._id;
      const viewer = opts.items[0].viewer; delete viewer._id;

      // update user points
      await global.db.engine.update('users.points', { id }, { points: isNaN(Number(viewer.points)) ? 0 : Number(viewer.points) });
      delete viewer.points;

      // update messages
      await global.db.engine.update('users.messages', { id }, { messages: isNaN(Number(viewer.stats.messages)) ? 0 : Number(viewer.stats.messages) });
      delete viewer.stats.messages;

      // update watch time
      await global.db.engine.update('users.watched', { id }, { watched: isNaN(Number(viewer.time.watched)) ? 0 : Number(viewer.time.watched) });
      delete viewer.time.watched;

      const bits = cloneDeep(viewer.stats.bits);
      const newBitsIds: string[] = [];
      for (const b of bits) {
        delete b.editation;
        b.amount = Number(b.amount); // force retype amount to be sure we really have number (ui is sending string)
        if (b.new) {
          delete b.new; delete b._id;
          const bit = await global.db.engine.insert('users.bits', b);
          newBitsIds.push(String(bit._id));
        } else {
          delete b.new;
          const _id = String(b._id); delete b._id;
          await global.db.engine.update('users.bits', { _id }, b);
        }
      }
      for (const t of (await global.db.engine.find('users.bits', { id }))) {
        if (!viewer.stats.bits.map(p => String(p._id)).includes(String(t._id)) && !newBitsIds.includes(String(t._id))) {
          await global.db.engine.remove('users.bits', { _id: String(t._id) });
        }
      }
      delete viewer.stats.bits;

      const tips = cloneDeep(viewer.stats.tips);
      const newTipsIds: string[] = [];
      for (const b of tips) {
        delete b.editation;
        b.tips = Number(b.tips); // force retype amount to be sure we really have number (ui is sending string)
        if (b.new) {
          delete b.new; delete b._id;
          b._amount = global.currency.exchange(Number(b.amount), b.currency, 'EUR'); // recounting amount to EUR to have simplified ordering
          b._currency = 'EUR'; // we are forcing _currency to have simplified ordering
          const tip = await global.db.engine.insert('users.tips', b);
          newTipsIds.push(String(tip._id));
        } else {
          delete b.new;
          const _id = String(b._id); delete b._id;
          await global.db.engine.update('users.tips', { _id }, b);
        }
      }
      for (const t of (await global.db.engine.find('users.tips', { id }))) {
        if (!viewer.stats.tips.map(p => String(p._id)).includes(String(t._id)) && !newTipsIds.includes(String(t._id))) {
          await global.db.engine.remove('users.tips', { _id: String(t._id) });
        }
      }
      delete viewer.stats.tips;

      await global.db.engine.update('users', { id }, viewer);
      cb(null, id);
    });
  }
}

export default Users;
export { Users };
