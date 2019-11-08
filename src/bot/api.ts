import axios from 'axios';
import querystring from 'querystring';
import { setTimeout } from 'timers';
import moment from 'moment';
require('moment-precise-range-plugin'); // moment.preciseDiff
import { isMainThread } from './cluster';
import chalk from 'chalk';
import { defaults, filter, get, isEmpty, isNil, isNull, map } from 'lodash';

import * as constants from './constants';
import Core from './_interface';
import { debug, error, follow, info, start, stop, unfollow, warning } from './helpers/log';
import { getBroadcaster, isBot, isBroadcaster, isIgnored, sendMessage } from './commons';

import { triggerInterfaceOnFollow } from './helpers/interface/triggers';
import { shared } from './decorators';
import { getChannelChattersUnofficialAPI } from './microservices/getChannelChattersUnofficialAPI';
import { ThreadEvent } from './entity/threadEvent';

import { getManager, getRepository } from 'typeorm';
import { User } from './entity/user';

const setImmediateAwait = () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), 10);
  });
};

const limitProxy = {
  get: function (obj, prop) {
    if (typeof obj[prop] === 'undefined') {
      if (prop === 'limit') {
        return 120;
      }
      if (prop === 'remaining') {
        return 800;
      }
      if (prop === 'refresh') {
        return (Date.now() / 1000) + 90;
      }
    } else {
      return obj[prop];
    }
  },
  set: function (obj, prop, value) {
    if (Number(value) === Number(obj[prop])) {
      return true;
    }
    value = Number(value);
    obj[prop] = value;
    return true;
  },
};

class API extends Core {
  @shared(true)
  stats: {
    currentWatchedTime: number;
    currentViewers: number;
    maxViewers: number;
    currentSubscribers: number;
    currentBits: number;
    currentTips: number;
    currentFollowers: number;
    currentViews: number;
    currentGame: string | null;
    currentTitle: string | null;
    currentHosts: number;
    newChatters: number;
  } = {
    currentWatchedTime: 0,
    currentViewers: 0,
    maxViewers: 0,
    currentSubscribers: 0,
    currentBits: 0,
    currentTips: 0,
    currentFollowers: 0,
    currentViews: 0,
    currentGame: null,
    currentTitle: null,
    currentHosts: 0,
    newChatters: 0,
  };

  @shared(true)
  isStreamOnline = false;
  @shared(true)
  streamStatusChangeSince: number =  Date.now();

  @shared(true)
  rawStatus = '';

  @shared(true)
  gameCache = '';

  calls = {
    bot: new Proxy({}, limitProxy),
    broadcaster: new Proxy({}, limitProxy),
  };
  rate_limit_follower_check: Set<string> = new Set();
  chatMessagesAtStart = global.linesParsed;
  maxRetries = 3;
  curRetries = 0;
  streamType = 'live';
  streamId: null | string = null;
  gameOrTitleChangedManually = false;

  retries = {
    getCurrentStreamData: 0,
    getChannelDataOldAPI: 0,
    getChannelSubscribers: 0,
  };

  api_timeouts: {
    [fnc: string]: {
      isRunning: boolean;
      opts: any;
    };
  } = {};

  constructor () {
    super();
    this.addMenu({ category: 'stats', name: 'api', id: 'stats/api' });

    if (isMainThread) {
      this.interval('getCurrentStreamData', constants.MINUTE);
      this.interval('getCurrentStreamTags', constants.MINUTE);
      this.interval('updateChannelViewsAndBroadcasterType', constants.MINUTE);
      this.interval('getLatest100Followers', constants.MINUTE);
      this.interval('getChannelHosts', 5 * constants.MINUTE);
      this.interval('getChannelSubscribers', 2 * constants.MINUTE);
      this.interval('getChannelChattersUnofficialAPI', 5 * constants.MINUTE);
      this.interval('getChannelDataOldAPI', constants.MINUTE);
      this.interval('intervalFollowerUpdate', constants.MINUTE * 5);
      this.interval('checkClips', constants.MINUTE);
      this.interval('getAllStreamTags', constants.HOUR * 12);

      setTimeout(() => {
        // free thread_event
        getManager()
          .createQueryBuilder()
          .delete()
          .from(ThreadEvent)
          .where('event = :event', { event: 'getChannelChattersUnofficialAPI' })
          .execute();
      }, 30000);
    } else {
      this.calls = {
        bot: {
          limit: 0,
          remaining: 0,
          refresh: 0,
        },
        broadcaster: {
          limit: 0,
          remaining: 0,
          refresh: 0,
        },
      };
    }
  }

  async setRateLimit (type, limit, remaining, reset) {
    this.calls[type].limit = limit;
    this.calls[type].remaining = remaining;
    this.calls[type].reset = reset;
  }

  async interval (fnc, interval, timeout = 10000) {
    setInterval(async () => {
      if (typeof this.api_timeouts[fnc] === 'undefined') {
        this.api_timeouts[fnc] = { opts: {}, isRunning: false };
      }

      if (!this.api_timeouts[fnc].isRunning) {
        this.api_timeouts[fnc].isRunning = true;
        const started_at = Date.now();
        debug('api.interval', chalk.yellow(fnc + '() ') + 'start');
        const value = await this[fnc](this.api_timeouts[fnc].opts);
        debug('api.interval', chalk.yellow(fnc + '(time: ' + (Date.now() - started_at) + ') ') + JSON.stringify(value));

        if (value.disable) {
          return;
        }
        if (value.state) { // if is ok, update opts and run unlock after a while
          if (typeof value.opts !== 'undefined') {
            this.api_timeouts[fnc].opts = value.opts;
          }
          setTimeout(() => {
            this.api_timeouts[fnc].isRunning = false;
          }, interval);
        } else { // else run next tick
          if (typeof value.opts !== 'undefined') {
            this.api_timeouts[fnc].opts = value.opts;
          }
          this.api_timeouts[fnc].isRunning = false;
        }
      }
    }, 1000);
  }

  async intervalFollowerUpdate () {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    for (const username of this.rate_limit_follower_check) {
      const user = await getRepository(User).findOne({ username });
      if (user) {
        const isSkipped = user.username === getBroadcaster() || user.username === global.oauth.botUsername;
        const userHaveId = !isNil(user.userId);
        if (new Date().getTime() - get(user, 'time.followCheck', 0) <= 1000 * 60 * 60 * 24 || isSkipped || !userHaveId) {
          this.rate_limit_follower_check.delete(user.username);
        }
      }
    }
    if (this.rate_limit_follower_check.size > 0 && !isNil(global.overlays)) {
      const user = await getRepository(User).findOne({ username: Array.from(this.rate_limit_follower_check)[0] });
      if (user) {
        this.rate_limit_follower_check.delete(user.username);
        await this.isFollowerUpdate(user);
      }
    }
    return { state: true };
  }

  async getUsernameFromTwitch (id) {
    const url = `https://api.twitch.tv/helix/users?id=${id}`;
    let request;
    /*
      {
        "data": [{
          "id": "44322889",
          "login": "dallas",
          "display_name": "dallas",
          "type": "staff",
          "broadcaster_type": "",
          "description": "Just a gamer playing games and chatting. :)",
          "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
          "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
          "view_count": 191836881,
          "email": "login@provider.com"
        }]
      }
    */

    const token = await global.oauth.botAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if ((needToWait || notEnoughAPICalls)) {
      return null;
    }

    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.limit = request.headers['ratelimit-limit'];
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.refresh = request.headers['ratelimit-reset'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }
      return request.data.data[0].login;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
    }
    return null;
  }

  async getIdFromTwitch (username, isChannelId = false) {
    const url = `https://api.twitch.tv/helix/users?login=${username}`;
    let request;
    /*
      {
        "data": [{
          "id": "44322889",
          "login": "dallas",
          "display_name": "dallas",
          "type": "staff",
          "broadcaster_type": "",
          "description": "Just a gamer playing games and chatting. :)",
          "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
          "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
          "view_count": 191836881,
          "email": "login@provider.com"
        }]
      }
    */

    const token = global.oauth.botAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if ((needToWait || notEnoughAPICalls) && !isChannelId) {
      return null;
    }

    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.limit = request.headers['ratelimit-limit'];
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      // $FlowFixMe error with flow on request.headers
      this.calls.bot.refresh = request.headers['ratelimit-reset'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      return request.data.data[0].id;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
        if (global.panel && global.panel.io) {
          global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
        }
      } else {
        if (global.panel && global.panel.io) {
          global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
        }
      }
    }
    return null;
  }

  async getChannelChattersUnofficialAPI (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const event = await getManager()
      .createQueryBuilder()
      .select('thread')
      .from(ThreadEvent, 'thread')
      .where('event = :event', { event: 'getChannelChattersUnofficialAPI' })
      .getOne();

    if (typeof event === 'undefined') {
      const { modStatus, partedUsers, joinedUsers } = await getChannelChattersUnofficialAPI();

      global.widgets?.joinpart?.send({ users: partedUsers, type: 'part' });
      for (const username of partedUsers) {
        if (!isIgnored({ username: username })) {
          await setImmediateAwait();
          global.events.fire('user-parted-channel', { username });
        }
      }

      global.widgets?.joinpart?.send({ users: joinedUsers, type: 'join' });
      for (const username of joinedUsers) {
        if (isIgnored({ username }) || global.oauth.botUsername === username) {
          continue;
        } else {
          await setImmediateAwait();
          this.isFollower(username);
          global.events.fire('user-joined-channel', { username });
        }
      }

      global.status.MOD = modStatus;
    }
    return { state: true, opts };
  }

  async getAllStreamTags(opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    let url = `https://api.twitch.tv/helix/tags/streams?first=100`;
    if (opts.cursor) {
      url += '&after=' + opts.cursor;
    }

    const token = global.oauth.botAccessToken;
    const needToWait = isNil(global.overlays) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      delete opts.count;
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });
      const tags = request.data.data;

      for(const tag of tags) {
        await global.db.engine.update('core.api.tags', { tag_id: tag.tag_id }, tag);
      }

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: tags, timestamp: Date.now(), call: 'getAllStreamTags', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (tags.length === 100) {
        // move to next page
        this.getAllStreamTags({ cursor: request.data.pagination.cursor });
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
    }
    delete opts.count;
    return { state: true, opts };

  }

  async getChannelSubscribers (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    opts = opts || {};

    const cid = global.oauth.channelId;
    let url = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${cid}&first=100`;
    if (opts.cursor) {
      url += '&after=' + opts.cursor;
    }
    if (typeof opts.count === 'undefined') {
      opts.count = -1;
    } // start at -1 because owner is subbed as well

    const token = global.oauth.broadcasterAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls || global.oauth.broadcasterType === '') {
      if (global.oauth.broadcasterType === '') {
        if (!opts.noAffiliateOrPartnerWarningSent) {
          warning('Broadcaster is not affiliate/partner, will not check subs');
          global.api.stats.currentSubscribers = 0;
        }
        delete opts.count;
        return { state: false, opts: { ...opts, noAffiliateOrPartnerWarningSent: true } };
      } else {
        return { state: false, opts: { ...opts, noAffiliateOrPartnerWarningSent: false } };
      }
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });
      const subscribers = request.data.data;
      if (opts.subscribers) {
        opts.subscribers = [...subscribers, ...opts.subscribers];
      } else {
        opts.subscribers = subscribers;
      }

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: subscribers, timestamp: Date.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (subscribers.length === 100) {
        // move to next page
        this.getChannelSubscribers({ cursor: request.data.pagination.cursor, count: subscribers.length + opts.count, subscribers });
      } else {
        this.stats.currentSubscribers = subscribers.length + opts.count;
        this.setSubscribers(opts.subscribers.filter(o => !isBroadcaster(o.user_name) && !isBot(o.user_name)));
      }

      // reset warning after correct calls (user may have affiliate or have correct oauth)
      opts.noAffiliateOrPartnerWarningSent = false;
      opts.notCorrectOauthWarningSent = false;
    } catch (e) {
      if (e.message === '403 Forbidden' && !opts.notCorrectOauthWarningSent) {
        opts.notCorrectOauthWarningSent = true;
        warning('Broadcaster have not correct oauth, will not check subs');
        this.stats.currentSubscribers = 0;
      } else {
        error(`${url} - ${e.stack}`);
        if (global.panel && global.panel.io) {
          global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
        }
      }
    }
    delete opts.count;
    return { state: true, opts };
  }

  async setSubscribers (subscribers) {
    const currentSubscribers = await getRepository(User).find({
      where: {
        isSubscriber: true,
      },
    });

    // check if current subscribers are still subs
    for (const user of currentSubscribers) {
      if (!subscribers
        .map((o) => String(o.user_id))
        .includes(String(user.userId))) {
        // subscriber is not sub anymore -> unsub and set subStreak to 0
        user.isSubscriber = false;
        user.subscribeStreak = 0;
        await getRepository(User).save(user);
      }
    }

    // update subscribers tier and set them active
    for (const user of subscribers) {
      await getRepository(User).update({
        userId: user.user_id,
      },
      {
        username: user.user_name.toLowerCase(),
        isSubscriber: true,
        subscribeTier: String(user.tier / 1000),
      });
    }
  }

  async getChannelDataOldAPI (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/kraken/channels/${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    if (needToWait) {
      return { state: false, opts };
    }
    // getChannelDatraOldAPI only if stream is offline
    if (this.isStreamOnline) {
      this.retries.getChannelDataOldAPI = 0;
      return { state: true, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token,
        },
      });
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: request.status });
      }

      if (!this.gameOrTitleChangedManually) {
        // Just polling update
        let rawStatus = this.rawStatus;
        const status = await this.parseTitle(null);

        if (request.data.status !== status && this.retries.getChannelDataOldAPI === -1) {
          return { state: true, opts };
        } else if (request.data.status !== status && !opts.forceUpdate) {
          // check if status is same as updated status
          const numOfRetries = global.twitch.isTitleForced ? 1 : 15;
          if (this.retries.getChannelDataOldAPI >= numOfRetries) {
            this.retries.getChannelDataOldAPI = 0;

            // if we want title to be forced
            if (global.twitch.isTitleForced) {
              const game = this.gameCache;
              info(`Title/game force enabled => ${game} | ${rawStatus}`);
              this.setTitleAndGame(null, { });
              return { state: true, opts };
            } else {
              info(`Title/game changed outside of a bot => ${request.data.game} | ${request.data.status}`);
              this.retries.getChannelDataOldAPI = -1;
              rawStatus = request.data.status;
            }
          } else {
            this.retries.getChannelDataOldAPI++;
            return { state: false, opts };
          }
        } else {
          this.retries.getChannelDataOldAPI = 0;
        }

        this.stats.currentGame = request.data.game;
        this.stats.currentTitle = request.data.status;
        this.gameCache = request.data.game;
        this.rawStatus = rawStatus;
      } else {
        this.gameOrTitleChangedManually = false;
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
      return { state: false, opts };
    }

    this.retries.getChannelDataOldAPI = 0;
    return { state: true, opts };
  }

  async getChannelHosts () {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = global.oauth.channelId;

    if (isNil(cid) || cid === '') {
      return { state: false };
    }

    let request;
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${cid}`;
    try {
      request = await axios.get(url);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: request.status });
      }
      this.stats.currentHosts = request.data.hosts.length;
    } catch (e) {
      error(`${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getChannelHosts', api: 'tmi', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
      return { state: e.response?.status === 500 };
    }

    return { state: true };
  }

  async updateChannelViewsAndBroadcasterType () {
    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/users/?id=${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'updateChannelViewsAndBroadcasterType', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (request.data.data.length > 0) {
        global.oauth.broadcasterType = request.data.data[0].broadcaster_type;
        this.stats.currentViews = request.data.data[0].view_count;
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'updateChannelViewsAndBroadcasterType', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
    }
    return { state: true };
  }

  async getLatest100Followers (quiet) {
    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`;
    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts: quiet };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      if (request.status === 200 && !isNil(request.data.data)) {
        // check if user id is in db, not in db load username from API
        for (const f of request.data.data) {
          await setImmediateAwait(); // throttle down

          f.from_name = String(f.from_name).toLowerCase();
          let user = await getRepository(User).findOne({ userId: f.from_id });
          if (!user) {
            user = new User();
            user.userId = f.from_id;
            user.username = f.from_name;
            user = await getRepository(User).save(user);
          }

          if (!user.isFollower) {
            if (new Date().getTime() - new Date(f.followed_at).getTime() < 2 * constants.HOUR) {
              if (user.followedAt === 0 || new Date().getTime() - user.followedAt > 60000 * 60 && !global.webhooks.existsInCache('follow', user.userId)) {
                global.webhooks.addIdToCache('follow', f.from_id);
                global.overlays.eventlist.add({
                  event: 'follow',
                  username: user.username,
                  timestamp: Date.now(),
                });
                if (!quiet && !isBot(user.username)) {
                  follow(user.username);
                  global.events.fire('follow', { username: user.username, userId: f.from_id });
                  global.registries.alerts.trigger({
                    event: 'follows',
                    name: user.username,
                    amount: 0,
                    currency: '',
                    monthsName: '',
                    message: '',
                    autohost: false,
                  });

                  triggerInterfaceOnFollow({
                    username: user.username,
                    userId: f.from_id,
                  });
                }
              }
            }
          }
          try {
            user.followedAt = new Date(f.followed_at).getTime();
            user.followCheckAt = Date.now();
            user.isFollower = true;
            await getRepository(User).save(user);
          } catch (e) {
            error(e.stack);
          }
        }
      }
      this.stats.currentFollowers =  request.data.total;
      quiet = false;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      quiet = e.errno !== 'ECONNREFUSED' && e.errno !== 'ETIMEDOUT';
      error(`${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
      return { state: false, opts: quiet };
    }
    return { state: true, opts: quiet };
  }

  async getGameFromId (id) {
    let request;
    const url = `https://api.twitch.tv/helix/games?id=${id}`;

    if (id.toString().trim().length === 0 || parseInt(id, 10) === 0) {
      return '';
    } // return empty game if gid is empty

    const gameFromDb = await global.db.engine.findOne('core.api.games', { id });

    // check if id is cached
    if (!isEmpty(gameFromDb)) {
      return gameFromDb.name;
    }

    try {
      const token = await global.oauth.botAccessToken;
      if (token === '') {
        throw new Error('token not available');
      }
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (isMainThread) {
        if (global.panel && global.panel.io) {
          global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
        }
      }

      // add id->game to cache
      const name = request.data.data[0].name;
      await global.db.engine.insert('core.api.games', { id, name });
      return name;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      warning(`Couldn't find name of game for gid ${id} - fallback to ${this.stats.currentGame}`);
      error(`API: ${url} - ${e.stack}`);
      if (isMainThread) {
        if (global.panel && global.panel.io) {
          global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
        }
      }
      return this.stats.currentGame;
    }
  }

  async getCurrentStreamTags (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getCurrentStreamTags', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      if (request.status === 200 && !isNil(request.data.data[0])) {
        const tags = request.data.data;
        await global.db.engine.remove('core.api.currentTags', {});
        for (const tag of tags) {
          await global.db.engine.update('core.api.currentTags', { tag_id: tag.tag_id }, tag);
        }
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getCurrentStreamTags', api: 'getCurrentStreamTags', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
      return { state: false, opts };
    }
    return { state: true, opts };
  }

  async getCurrentStreamData (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED;

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      let justStarted = false;

      debug('api.stream', 'API: ' + JSON.stringify(request.data));

      if (request.status === 200 && !isNil(request.data.data[0])) {
        // correct status and we've got a data - stream online
        const stream = request.data.data[0];

        if (!moment.preciseDiff(moment(stream.started_at), moment(this.streamStatusChangeSince), true).firstDateWasLater) {
          this.streamStatusChangeSince = (new Date(stream.started_at)).getTime();
        }
        if (!this.isStreamOnline || this.streamType !== stream.type) {
          this.chatMessagesAtStart = global.linesParsed;

          if (!global.webhooks.enabled.streams && Number(this.streamId) !== Number(stream.id)) {
            debug('api.stream', 'API: ' + JSON.stringify(stream));
            start(
              `id: ${stream.id} | startedAt: ${stream.started_at} | title: ${stream.title} | game: ${await this.getGameFromId(stream.game_id)} | type: ${stream.type} | channel ID: ${cid}`
            );

            // reset quick stats on stream start
            this.stats.currentWatchedTime = 0;
            this.stats.maxViewers = 0;
            this.stats.newChatters = 0;
            this.stats.currentViewers = 0;
            this.stats.currentBits = 0;
            this.stats.currentTips = 0;

            this.streamStatusChangeSince = new Date(stream.started_at).getTime();
            this.streamId = stream.id;
            this.streamType = stream.type;

            global.events.fire('stream-started', {});
            global.events.fire('command-send-x-times', { reset: true });
            global.events.fire('keyword-send-x-times', { reset: true });
            global.events.fire('every-x-minutes-of-stream', { reset: true });
            justStarted = true;

            // go through all systems and trigger on.streamStart
            for (const [/* type */, systems] of Object.entries({
              systems: global.systems,
              games: global.games,
              overlays: global.overlays,
              widgets: global.widgets,
              integrations: global.integrations,
            })) {
              for (const [name, system] of Object.entries(systems)) {
                if (name.startsWith('_') || typeof system.on === 'undefined') {
                  continue;
                }
                if (Array.isArray(system.on.streamStart)) {
                  for (const fnc of system.on.streamStart) {
                    system[fnc]();
                  }
                }
              }
            }
          }
        }

        this.curRetries = 0;
        this.saveStreamData(stream);
        this.isStreamOnline = true;

        if (!justStarted) {
          // don't run events on first check
          global.events.fire('number-of-viewers-is-at-least-x', {});
          global.events.fire('stream-is-running-x-minutes', {});
          global.events.fire('every-x-minutes-of-stream', {});
        }

        if (!this.gameOrTitleChangedManually) {
          let rawStatus = this.rawStatus;
          const status = await this.parseTitle(null);
          const game = await this.getGameFromId(stream.game_id);

          this.stats.currentTitle = stream.title;
          this.stats.currentGame = game;

          if (stream.title !== status) {
            // check if status is same as updated status
            if (this.retries.getCurrentStreamData >= 12) {
              this.retries.getCurrentStreamData = 0;
              rawStatus = stream.title;
              this.rawStatus = rawStatus;
            } else {
              this.retries.getCurrentStreamData++;
              return { state: false, opts };
            }
          } else {
            this.retries.getCurrentStreamData = 0;
          }
          this.gameCache = game;
          this.rawStatus = rawStatus;
        }
      } else {
        if (this.isStreamOnline && this.curRetries < this.maxRetries) {
          // retry if it is not just some network / twitch issue
          this.curRetries = this.curRetries + 1;
        } else {
          // stream is really offline
          if (this.isStreamOnline) {
            // online -> offline transition
            stop('');
            this.streamStatusChangeSince = Date.now();
            this.isStreamOnline = false;
            this.curRetries = 0;
            global.events.fire('stream-stopped', {});
            global.events.fire('stream-is-running-x-minutes', { reset: true });
            global.events.fire('number-of-viewers-is-at-least-x', { reset: true });

            // go through all systems and trigger on.streamEnd
            for (const [, systems] of Object.entries({
              systems: global.systems,
              games: global.games,
              overlays: global.overlays,
              widgets: global.widgets,
              integrations: global.integrations,
            })) {
              for (const [name, system] of Object.entries(systems)) {
                if (name.startsWith('_') || typeof system.on === 'undefined') {
                  continue;
                }
                if (Array.isArray(system.on.streamEnd)) {
                  for (const fnc of system.on.streamEnd) {
                    system[fnc]();
                  }
                }
              }
            }

            this.streamId = null;
          }
        }
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
      return { state: false, opts };
    }
    return { state: true, opts };
  }

  saveStreamData (stream) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    this.stats.currentViewers = stream.viewer_count;

    if (this.stats.maxViewers < stream.viewer_count) {
      this.stats.maxViewers = stream.viewer_count;
    }

    global.stats2.save({
      timestamp: new Date().getTime(),
      whenOnline: global.api.isStreamOnline ? global.api.streamStatusChangeSince : null,
      currentViewers: this.stats.currentViewers,
      currentSubscribers: this.stats.currentSubscribers,
      currentFollowers: this.stats.currentFollowers,
      currentBits: this.stats.currentBits,
      currentTips: this.stats.currentTips,
      chatMessages: global.linesParsed - this.chatMessagesAtStart,
      currentViews: this.stats.currentViews,
      maxViewers: this.stats.maxViewers,
      newChatters: this.stats.newChatters,
      currentHosts: this.stats.currentHosts,
      currentWatched: this.stats.currentWatchedTime,
      game_id: stream.game_id,
      user_id: stream.user_id,
      type: stream.type,
      language: stream.language,
      title: stream.title,
      thumbnail_url: stream.thumbnail_url,
    });
  }

  async parseTitle (title) {
    if (isNil(title)) {
      title = this.rawStatus;
    }

    const regexp = new RegExp('\\$_[a-zA-Z0-9_]+', 'g');
    const match = title.match(regexp);

    if (!isNil(match)) {
      for (const variable of title.match(regexp)) {
        let value;
        if (await global.customvariables.isVariableSet(variable)) {
          value = await global.customvariables.getValueOf(variable);
        } else {
          value = global.translate('webpanel.not-available');
        }
        title = title.replace(new RegExp(`\\${variable}`, 'g'), value);
      }
    }
    return title;
  }

  async setTags (sender, tagsArg) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    if (needToWait) {
      setTimeout(() => this.setTags(sender, tagsArg), 1000);
      return;
    }

    try {
      const tags = (await global.db.engine.find('core.api.tags'))
        .filter(o => {
          const localization = Object.keys(o.localization_names).find(p => p.includes(global.general.lang));
          return tagsArg.includes(o.localization_names[localization || '']);
        });
      const request = await axios({
        method: 'put',
        url,
        data: {
          tag_ids: tags.map(o => {
            return o.tag_id;
          }),
        },
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      await global.db.engine.remove('core.api.currentTags', { is_auto: false });
      if (tags.length > 0) {
        await global.db.engine.insert('core.api.currentTags', tags.map(o => {
          delete o._id;
          return o;
        }));
      }
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'setTags', api: 'helix', endpoint: url, code: request.status, data: request.data });
      }
    } catch (e) {
      error(`API: ${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'setTags', api: 'helix', endpoint: url, code: get(e, 'response.status', '500'), data: e.stack });
      }
      return false;
    }


  }

  async setTitleAndGame (sender, args) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    args = defaults(args, { title: null }, { game: null });
    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/kraken/channels/${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    if (needToWait) {
      setTimeout(() => this.setTitleAndGame(sender, args), 1000);
      return;
    }

    let request;
    let status;
    let game;
    try {
      if (!isNil(args.title)) {
        this.rawStatus = args.title; // save raw status to cache, if changing title
      }
      status = await this.parseTitle(this.rawStatus);

      if (!isNil(args.game)) {
        game = args.game;
        this.gameCache = args.game; // save game to cache, if changing gae
      } else {
        game = this.gameCache;
      } // we are not setting game -> load last game

      request = await axios({
        method: 'put',
        url,
        data: {
          channel: {
            game: game,
            status: status,
          },
        },
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token,
        },
      });
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: request.status });
      }
    } catch (e) {
      error(`API: ${url} - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
      return false;
    }

    if (request.status === 200 && !isNil(request.data)) {
      const response = request.data;
      if (!isNil(args.game)) {
        response.game = isNil(response.game) ? '' : response.game;
        if (response.game.trim() === args.game.trim()) {
          sendMessage(global.translate('game.change.success')
            .replace(/\$game/g, response.game), sender);
          global.events.fire('game-changed', { oldGame: this.stats.currentGame, game: response.game });
          this.stats.currentGame = response.game;
        } else {
          sendMessage(global.translate('game.change.failed')
            .replace(/\$game/g, this.stats.currentGame), sender);
        }
      }

      if (!isNull(args.title)) {
        if (response.status.trim() === status.trim()) {
          sendMessage(global.translate('title.change.success')
            .replace(/\$title/g, response.status), sender);
          this.stats.currentTitle = response.status;
        } else {
          sendMessage(global.translate('title.change.failed')
            .replace(/\$title/g, this.stats.currentTitle), sender);
        }
      }
      this.gameOrTitleChangedManually = true;
      this.retries.getCurrentStreamData = 0;
      return true;
    }
  }

  async sendGameFromTwitch (self, socket, game) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    const url = `https://api.twitch.tv/kraken/search/games?query=${encodeURIComponent(game)}&type=suggest`;

    const token = await global.oauth.botAccessToken;
    if (token === '') {
      return;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token,
        },
      });
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: request.status });
      }
    } catch (e) {
      error(`API: ${url} - ${e.stack}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
      return;
    }

    if (isNull(request.data.games)) {
      if (socket) {
        socket.emit('sendGameFromTwitch', []);
      }
      return false;
    } else {
      if (socket) {
        socket.emit('sendGameFromTwitch', map(request.data.games, 'name'));
      }
      return map(request.data.games, 'name');
    }
  }

  async checkClips () {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const token = global.oauth.botAccessToken;
    if (token === '') {
      return { state: false };
    }

    let notCheckedClips = (await global.db.engine.find('api.clips', { isChecked: false }));

    // remove clips which failed
    for (const clip of filter(notCheckedClips, (o) => new Date(o.shouldBeCheckedAt).getTime() < new Date().getTime())) {
      await global.db.engine.remove('api.clips', { _id: String(clip._id) });
    }
    notCheckedClips = filter(notCheckedClips, (o) => new Date(o.shouldBeCheckedAt).getTime() >= new Date().getTime());
    const url = `https://api.twitch.tv/helix/clips?id=${notCheckedClips.map((o) => o.clipId).join(',')}`;

    if (notCheckedClips.length === 0) { // nothing to do
      return { state: true };
    }

    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (notEnoughAPICalls) {
      return { state: false };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      for (const clip of request.data.data) {
        // clip found in twitch api
        await global.db.engine.update('api.clips', { clipId: clip.id }, { isChecked: true });
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`API: ${url} - ${e.stack}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
    }
    return { state: true };
  }

  async createClip (opts) {
    if (!isMainThread) {
      throw Error('API can run only on master');
    }

    if (!(this.isStreamOnline)) {
      return;
    } // do nothing if stream is offline

    const isClipChecked = async function (id) {
      const check = async (resolve, reject) => {
        const clip = await global.db.engine.findOne('api.clips', { clipId: id });
        if (isEmpty(clip)) {
          resolve(false);
        } else if (clip.isChecked) {
          resolve(true);
        } else {
          // not checked yet
          setTimeout(() => check(resolve, reject), 100);
        }
      };
      return new Promise(async (resolve, reject) => check(resolve, reject));
    };

    defaults(opts, { hasDelay: true });

    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || isNil(global.overlays) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      setTimeout(() => this.createClip(opts), 1000);
      return;
    }

    let request;
    try {
      request = await axios({
        method: 'post',
        url,
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'createClip', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`API: ${url} - ${e.stack}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'createClip', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
      return;
    }
    const clipId = request.data.data[0].id;
    const timestamp = new Date();
    await global.db.engine.insert('api.clips', { clipId: clipId, isChecked: false, shouldBeCheckedAt: new Date(timestamp.getTime() + 120 * 1000) });
    return (await isClipChecked(clipId)) ? clipId : null;
  }

  async fetchAccountAge (username, id) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    const url = `https://api.twitch.tv/kraken/users/${id}`;

    const token = await global.oauth.botAccessToken;
    if (token === '') {
      return;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token,
        },
      });
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: request.status });
      }
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') {
        return;
      } // ignore ECONNRESET errors

      let logError;
      try {
        logError = e.response.data.status !== 422;
      } catch (e) {
        logError = true;
      }

      if (logError) {
        error(`API: ${url} - ${e.stack}`);
        if (global.panel && global.panel.io) {
          global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
        }
      }
      return;
    }
    await getRepository(User).update({ userId: id }, { createdAt: new Date(request.data.created_at).getTime() });
  }

  async isFollower (username) {
    this.rate_limit_follower_check.add(username);
  }

  async isFollowerUpdate (user: User | undefined) {
    if (!user || !user.userId) {
      return;
    }
    const id = user.userId;

    // reload user from db
    user = {
      ...user,
      ...await getRepository(User).findOne({ userId: id }),
    };

    clearTimeout(this.timeouts['isFollowerUpdate-' + id]);

    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/users/follows?from_id=${id}&to_id=${cid}`;

    const token = await global.oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || (isNil(global.overlays) && isMainThread) || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 40 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      this.timeouts['isFollowerUpdate-' + id] = setTimeout(() => this.isFollowerUpdate(user), 1000);
      return null;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`API: ${url} - ${e.stack}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
      return null;
    }

    if (request.data.total === 0) {
      // not a follower
      // if was follower, fire unfollow event
      if (user.isFollower) {
        unfollow(user.username);
        global.events.fire('unfollow', { username: user.username });
      }
      user.isFollower = false;
      user.followedAt = 0;
      user.followCheckAt = Date.now();
      await getRepository(User).save(user);
      return { isFollower: user.isFollower, followedAt: user.followedAt };
    } else {
      // is follower
      if (!user.isFollower && new Date().getTime() - new Date(request.data.data[0].followed_at).getTime() < 60000 * 60) {
        global.overlays.eventlist.add({
          event: 'follow',
          username: user.username,
          timestamp: Date.now(),
        });
        follow(user.username);
        global.events.fire('follow', { username: user.username, userId: id });
        global.registries.alerts.trigger({
          event: 'follows',
          name: user.username,
          amount: 0,
          currency: '',
          monthsName: '',
          message: '',
          autohost: false,
        });

        triggerInterfaceOnFollow({
          username: user.username,
          userId: id,
        });
      }

      user.isFollower = true;
      user.followedAt = Number(moment(request.data.data[0].followed_at).format('x'));
      user.followCheckAt = Date.now();
      await getRepository(User).save(user);
      return { isFollower: user.isFollower, followedAt: user.followedAt };
    }
  }

  async createMarker () {
    const token = global.oauth.botAccessToken;
    const cid = global.oauth.channelId;

    const url = 'https://api.twitch.tv/helix/streams/markers';
    try {
      if (token === '') {
        throw Error('missing bot accessToken');
      }
      if (cid === '') {
        throw Error('channel is not set');
      }

      const request = await axios({
        method: 'post',
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        data: {
          user_id: String(cid),
          description: 'Marked from sogeBot',
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining, data: request.data });
      }
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') {
        return this.createMarker();
      }
      error(`API: Marker was not created - ${e.message}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
    }
  }

  async getClipById (id) {
    const url = `https://api.twitch.tv/helix/clips/?id=${id}`;

    const token = await global.oauth.botAccessToken;
    if (token === '') {
      return null;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
      });
      global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      return request.data;
    } catch (e) {
      error(`${url} - ${e.message}`);
      global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: `${e.status} ${get(e, 'body.message', e.statusText)}`, remaining: this.calls.bot.remaining });
      return null;
    }
  }

  async getTopClips (opts) {
    let url = 'https://api.twitch.tv/helix/clips?broadcaster_id=' + global.oauth.channelId;
    const token = global.oauth.botAccessToken;
    try {
      if (token === '') {
        throw Error('No broadcaster access token');
      }
      if (typeof opts === 'undefined' || !opts) {
        throw Error('Missing opts');
      }

      if (opts.period) {
        if (opts.period === 'stream') {
          url += '&' + querystring.stringify({
            started_at: (new Date(this.streamStatusChangeSince)).toISOString(),
            ended_at: (new Date()).toISOString(),
          });
        } else {
          if (!opts.days || opts.days < 0) {
            throw Error('Days cannot be < 0');
          }
          url += '&' + querystring.stringify({
            started_at: (new Date((new Date()).setDate(-opts.days))).toISOString(),
            ended_at: (new Date()).toISOString(),
          });
        }
      }
      if (opts.first) {
        url += '&first=' + opts.first;
      }

      const request = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      // get mp4 from thumbnail
      for (const c of request.data.data) {
        c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
        c.game = await this.getGameFromId(c.game_id);
      }
      return request.data.data;
    } catch (e) {
      error(`API: ${url} - ${e.stack}`);
      if (global.panel && global.panel.io) {
        global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'getTopClips', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
    }
  }
}

export default API;
export { API };