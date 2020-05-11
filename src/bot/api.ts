import axios from 'axios';
import querystring from 'querystring';
import { setTimeout } from 'timers';
import moment from 'moment';
require('moment-precise-range-plugin'); // moment.preciseDiff
import { isMainThread } from './cluster';
import chalk from 'chalk';
import { chunk, cloneDeep, defaults, filter, get, isNil, isNull, map } from 'lodash';

import * as constants from './constants';
import Core from './_interface';

import { debug, error, follow, info, start, stop, unfollow, warning } from './helpers/log';
import { getBroadcaster, isBot, isBroadcaster, isIgnored } from './commons';

import { triggerInterfaceOnFollow } from './helpers/interface/triggers';
import { shared } from './decorators';
import { getChannelChattersUnofficialAPI } from './microservices/getChannelChattersUnofficialAPI';
import { ThreadEvent } from './database/entity/threadEvent';

import { getManager, getRepository, IsNull, Not } from 'typeorm';
import { User, UserInterface } from './database/entity/user';
import { TwitchClips, TwitchTag, TwitchTagLocalizationDescription, TwitchTagLocalizationName } from './database/entity/twitch';
import { CacheGames } from './database/entity/cacheGames';
import oauth from './oauth';
import events from './events';
import twitch from './twitch';
import customvariables from './customvariables';
import { translate } from './translate';
import { ioServer } from './helpers/panel';
import joinpart from './widgets/joinpart';
import webhooks from './webhooks';
import alerts from './registries/alerts';
import eventlist from './overlays/eventlist';
import stats from './stats';
import { getFunctionList } from './decorators/on';
import { linesParsed, setStatus } from './helpers/parser';
import { isDbConnected } from './helpers/database';
import { find } from './helpers/register';
import { SQLVariableLimit } from './helpers/sql';

let latestFollowedAtTimestamp = 0;

export const currentStreamTags: {
  is_auto: boolean;
  localization_names: {
    [lang: string]: string;
  };
}[] = [];

let intervals = 0;
let lastIsAPIFreeKey = '__unset__';
let lastIsAPIFreeKeyStart = Date.now();

const isAPIFree = (intervalList) => {
  for (const key of Object.keys(intervalList)) {
    if (intervalList[key].inProgress) {
      if (lastIsAPIFreeKey !== key) {
        lastIsAPIFreeKey = key;
        lastIsAPIFreeKeyStart = Date.now();
      }

      if (Date.now() - lastIsAPIFreeKeyStart > 10 * constants.MINUTE) {
        warning(`API call for ${key} is probably frozen (took more than 10minutes), forcefully unblocking`);
        intervalList[key].inProgress = false;
        lastIsAPIFreeKey = '__unset__';
        return true;
      }
      return false;
    }
  }
  lastIsAPIFreeKey = '__unset__';
  return true;
};

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

const updateFollowerState = async(users: Readonly<Required<UserInterface>>[], usersFromAPI: { from_name: string; from_id: number; followed_at: string }[]) => {
  // handle users currently not following
  users.filter(user => !user.isFollower).forEach(user => {
    const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
    if (new Date().getTime() - new Date(apiUser.followed_at).getTime() < 2 * constants.HOUR) {
      if (user.followedAt === 0 || new Date().getTime() - user.followedAt > 60000 * 60 && !webhooks.existsInCache('follow', user.userId)) {
        webhooks.addIdToCache('follow', user.userId);
        eventlist.add({
          event: 'follow',
          username: user.username,
          timestamp: Date.now(),
        });
        if (!isBot(user.username)) {
          follow(user.username);
          events.fire('follow', { username: user.username, userId: user.userId });
          alerts.trigger({
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
            userId: user.userId,
          });
        }
      }
    }
  });
  await getRepository(User).save(
    users.map(user => {
      const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
      return {
        ...user,
        followedAt: user.haveFollowedAtLock ? user.followedAt : new Date(apiUser.followed_at).getTime(),
        isFollower: user.haveFollowerLock? user.isFollower : true,
        followCheckAt: Date.now(),
      };
    }),
    { chunk: Math.floor(SQLVariableLimit / Object.keys(users[0]).length) },
  );
};

const processFollowerState = async (users: { from_name: string; from_id: number; followed_at: string }[]) => {
  const timer = Date.now();
  if (users.length === 0) {
    debug('api.followers', `No followers to process.`);
    return;
  }
  debug('api.followers', `Processing ${users.length} followers`);
  const usersGotFromDb = (await Promise.all(
    chunk(users, SQLVariableLimit).map(async (bulk) => {
      return await getRepository(User).findByIds(bulk.map(user => user.from_id));
    })
  )).flat();
  debug('api.followers', `Found ${usersGotFromDb.length} followers in database`);
  if (users.length > usersGotFromDb.length) {
    const usersSavedToDb = await getRepository(User).save(
      users
        .filter(user => !usersGotFromDb.find(db => db.userId === user.from_id))
        .map(user => {
          return { userId: user.from_id, username: user.from_name };
        }),
      { chunk: Math.floor(SQLVariableLimit / Object.keys(users[0]).length) },
    );
    await updateFollowerState([...usersSavedToDb, ...usersGotFromDb], users);
  } else {
    await updateFollowerState(usersGotFromDb, users);
  }
  debug('api.followers', `Finished parsing ${users.length} followers in ${Date.now() - timer}ms`);
};

class API extends Core {
  @shared(true)
  stats: {
    language: string;
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
    language: 'en',
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
  chatMessagesAtStart = linesParsed;
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
      inProgress: boolean;
      opts: any;
    };
  } = {};

  constructor () {
    super();
    this.addMenu({ category: 'stats', name: 'api', id: 'stats/api' });

    if (isMainThread) {
      this.interval('getCurrentStreamData', constants.MINUTE);
      this.interval('getCurrentStreamTags', constants.MINUTE);
      this.interval('updateChannelViewsAndBroadcasterType', constants.HOUR);
      this.interval('getLatest100Followers', constants.MINUTE);
      this.interval('getChannelFollowers', constants.DAY);
      this.interval('getChannelHosts', 10 * constants.MINUTE);
      this.interval('getChannelSubscribers', 2 * constants.MINUTE);
      this.interval('getChannelChattersUnofficialAPI', 10 * constants.MINUTE);
      this.interval('getChannelDataOldAPI', constants.MINUTE);
      this.interval('checkClips', constants.MINUTE);
      this.interval('getAllStreamTags', constants.DAY);

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

  async interval (fnc, interval) {
    intervals++;
    setTimeout(() => {
      setInterval(async () => {
        if (typeof this.api_timeouts[fnc] === 'undefined') {
          this.api_timeouts[fnc] = { opts: {}, isRunning: false, inProgress: false };
        }

        if (!this.api_timeouts[fnc].isRunning && isAPIFree(cloneDeep(this.api_timeouts))) {
          this.api_timeouts[fnc].inProgress = true;
          this.api_timeouts[fnc].isRunning = true;
          const started_at = Date.now();
          debug('api.interval', chalk.yellow(fnc + '() ') + 'start');
          const value = await this[fnc](this.api_timeouts[fnc].opts);
          debug('api.interval', chalk.yellow(fnc + '(time: ' + (Date.now() - started_at) + ') ') + JSON.stringify(value));
          this.api_timeouts[fnc].inProgress = false;
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
      }, 30000);
    }, intervals * 1000);
  }

  async followerUpdatePreCheck (username: string) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const user = await getRepository(User).findOne({ username });
    if (user) {
      const isSkipped = user.username === getBroadcaster() || user.username === oauth.botUsername;
      const userHaveId = !isNil(user.userId);
      if (new Date().getTime() - user.followCheckAt <= constants.DAY || isSkipped || !userHaveId) {
        return;
      }
      await this.isFollowerUpdate(user);
    }
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

    const token = await oauth.botAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if ((needToWait || notEnoughAPICalls)) {
      return null;
    }

    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.limit = request.headers['ratelimit-limit'];
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      return request.data.data[0].login;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
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

    const token = oauth.botAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if ((needToWait || notEnoughAPICalls) && !isChannelId) {
      return null;
    }

    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.limit = request.headers['ratelimit-limit'];
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      return request.data.data[0].id;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];

        ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      } else {

        ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
    }
    return null;
  }

  async getChannelChattersUnofficialAPI (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const oAuthIsSet = oauth.botUsername.length > 0
      && oauth.channelId.length > 0
      && oauth.currentChannel.length > 0;

    if (!isDbConnected || !oAuthIsSet) {
      return { state: false, opts };
    }

    const event = await getRepository(ThreadEvent).findOne({ event: 'getChannelChattersUnofficialAPI' });
    if (typeof event === 'undefined') {
      const { modStatus, partedUsers, joinedUsers } = await getChannelChattersUnofficialAPI();

      joinpart.send({ users: partedUsers, type: 'part' });
      for (const username of partedUsers) {
        if (!isIgnored({ username: username })) {
          await setImmediateAwait();
          events.fire('user-parted-channel', { username });
        }
      }

      joinpart.send({ users: joinedUsers, type: 'join' });
      for (const username of joinedUsers) {
        if (isIgnored({ username }) || oauth.botUsername === username) {
          continue;
        } else {
          await setImmediateAwait();
          this.followerUpdatePreCheck(username);
          events.fire('user-joined-channel', { username });
        }
      }

      setStatus('MOD', modStatus);
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

    const token = oauth.botAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });
      const tags = request.data.data;

      for(const tag of tags) {
        const localizationNames = await getRepository(TwitchTagLocalizationName).find({ tagId: tag.tag_id });
        const localizationDescriptions = await getRepository(TwitchTagLocalizationDescription).find({ tagId: tag.tag_id });
        await getRepository(TwitchTag).save({
          tag_id: tag.tag_id,
          is_auto: tag.is_auto,
          localization_names: Object.keys(tag.localization_names).map(key => {
            return {
              id: localizationNames.find(o => o.locale === key && o.tagId === tag.tag_id)?.id,
              locale: key,
              value: tag.localization_names[key],
            };
          }),
          localization_descriptions: Object.keys(tag.localization_descriptions).map(key => {
            return {
              id: localizationDescriptions.find(o => o.locale === key && o.tagId === tag.tag_id)?.id,
              locale: key,
              value: tag.localization_descriptions[key],
            };
          }),
        });
      }
      await getRepository(TwitchTagLocalizationDescription).delete({ tagId: IsNull() });
      await getRepository(TwitchTagLocalizationName).delete({ tagId: IsNull() });

      ioServer?.emit('api.stats', { data: tags, timestamp: Date.now(), call: 'getAllStreamTags', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (tags.length === 100) {
        // move to next page
        return this.getAllStreamTags({ cursor: request.data.pagination.cursor });
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getAllStreamTags', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
    }
    delete opts.cursor;
    return { state: true, opts };

  }

  async getChannelSubscribers (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    opts = opts || {};

    const cid = oauth.channelId;
    let url = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${cid}&first=100`;
    if (opts.cursor) {
      url += '&after=' + opts.cursor;
    }
    if (typeof opts.count === 'undefined') {
      opts.count = -1;
    } // start at -1 because owner is subbed as well

    const token = oauth.broadcasterAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = this.calls.broadcaster.remaining <= 30 && this.calls.broadcaster.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls || oauth.broadcasterType === '') {
      if (oauth.broadcasterType === '') {
        if (!opts.noAffiliateOrPartnerWarningSent) {
          warning('Broadcaster is not affiliate/partner, will not check subs');
          this.stats.currentSubscribers = 0;
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
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });
      const subscribers = request.data.data;
      if (opts.subscribers) {
        opts.subscribers = [...subscribers, ...opts.subscribers];
      } else {
        opts.subscribers = subscribers;
      }

      ioServer?.emit('api.stats', { data: subscribers, timestamp: Date.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      // save remaining api calls
      this.calls.broadcaster.remaining = request.headers['ratelimit-remaining'];
      this.calls.broadcaster.refresh = request.headers['ratelimit-reset'];
      this.calls.broadcaster.limit = request.headers['ratelimit-limit'];

      if (subscribers.length === 100) {
        // move to next page
        return this.getChannelSubscribers({ cursor: request.data.pagination.cursor, count: opts.subscribers.length + opts.count, subscribers: opts.subscribers });
      } else {
        this.stats.currentSubscribers = subscribers.length + opts.count;
        this.setSubscribers(opts.subscribers.filter(o => !isBroadcaster(o.user_name) && !isBot(o.user_name)));
      }

      // reset warning after correct calls (user may have affiliate or have correct oauth)
      opts.noAffiliateOrPartnerWarningSent = false;
      opts.notCorrectOauthWarningSent = false;
    } catch (e) {
      if ((e.message === '403 Forbidden' || e.message === 'Request failed with status code 401')) {
        if (!opts.notCorrectOauthWarningSent) {
          opts.notCorrectOauthWarningSent = true;
          warning('Broadcaster have not correct oauth, will not check subs');
        }
        this.stats.currentSubscribers = 0;
      } else {
        error(`${url} - ${e.stack}`);

        ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
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
      if (!user.haveSubscriberLock && !subscribers
        .map((o) => String(o.user_id))
        .includes(String(user.userId))) {
        // subscriber is not sub anymore -> unsub and set subStreak to 0
        await getRepository(User).save({
          ...user,
          isSubscriber: false,
          subscribeStreak: 0,
        });
      }
    }

    // update subscribers tier and set them active
    for (const user of subscribers) {
      const current = currentSubscribers.find(o => Number(o.userId) === Number(user.user_id));
      const isNotCurrentSubscriber = !current;
      const valuesNotMatch = current && (current.subscribeTier !== String(user.tier / 1000) || current.isSubscriber === false);
      if (isNotCurrentSubscriber || valuesNotMatch) {
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
  }

  async getChannelDataOldAPI (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/kraken/channels/${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
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
        timeout: 20000,
      });
      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: request.status });

      if (!this.gameOrTitleChangedManually) {
        // Just polling update
        let rawStatus = this.rawStatus;
        const status = await this.parseTitle(null);

        if (request.data.status !== status && this.retries.getChannelDataOldAPI === -1) {
          return { state: true, opts };
        } else if (request.data.status !== status && !opts.forceUpdate) {
          // check if status is same as updated status
          const numOfRetries = twitch.isTitleForced ? 1 : 15;
          if (this.retries.getChannelDataOldAPI >= numOfRetries) {
            this.retries.getChannelDataOldAPI = 0;

            // if we want title to be forced
            if (twitch.isTitleForced) {
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

        this.stats.language = request.data.language;
        this.stats.currentGame = request.data.game;
        this.stats.currentTitle = request.data.status;
        this.gameCache = request.data.game;
        this.rawStatus = rawStatus;
      } else {
        this.gameOrTitleChangedManually = false;
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getChannelDataOldAPI', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      return { state: false, opts };
    }

    this.retries.getChannelDataOldAPI = 0;
    return { state: true, opts };
  }

  async getChannelHosts () {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = oauth.channelId;

    if (isNil(cid) || cid === '') {
      return { state: false };
    }

    let request;
    const url = `http://tmi.twitch.tv/hosts?include_logins=1&target=${cid}`;
    try {
      request = await axios.get(url);
      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getChannelHosts', api: 'other', endpoint: url, code: request.status });
      this.stats.currentHosts = request.data.hosts.length;
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getChannelHosts', api: 'other', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      return { state: e.response?.status === 500 };
    }

    return { state: true };
  }

  async updateChannelViewsAndBroadcasterType () {
    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/users/?id=${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
      });
      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'updateChannelViewsAndBroadcasterType', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (request.data.data.length > 0) {
        oauth.profileImageUrl = request.data.data[0].profile_image_url;
        oauth.broadcasterType = request.data.data[0].broadcaster_type;
        this.stats.currentViews = request.data.data[0].view_count;
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'updateChannelViewsAndBroadcasterType', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
    }
    return { state: true };
  }

  async getLatest100Followers () {
    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`;
    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      if (request.status === 200 && !isNil(request.data.data)) {
        // we will go through only new users
        if (request.data.data.length > 0 && new Date(request.data.data[0].followed_at).getTime() !== latestFollowedAtTimestamp) {
          processFollowerState(request.data.data
            .filter(f => latestFollowedAtTimestamp < new Date(f.followed_at).getTime())
            .map(f => {
              return {
                from_name: String(f.from_name).toLowerCase(),
                from_id: Number(f.from_id),
                followed_at: f.followed_at,
              };
            }));
          latestFollowedAtTimestamp = new Date(request.data.data[0].followed_at).getTime();
        } else {
          debug('api.followers', 'No new followers found.');
        }
      }
      this.stats.currentFollowers =  request.data.total;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      return { state: false };
    }
    return { state: true };
  }

  async getChannelFollowers (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    opts = opts || {};

    const cid = oauth.channelId;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`;
    if (opts.cursor) {
      url += '&after=' + opts.cursor;
    } else {
      debug('api.getChannelFollowers', 'started');
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getChannelFollowers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      if (request.status === 200 && !isNil(request.data.data)) {
        const followers = request.data.data;
        if (opts.followers) {
          opts.followers = [...followers, ...opts.followers];
        } else {
          opts.followers = followers;
        }


        ioServer?.emit('api.stats', { data: followers, timestamp: Date.now(), call: 'getChannelFollowers', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

        debug('api.getChannelFollowers', `Followers loaded: ${opts.followers.length}, cursor: ${request.data.pagination.cursor}`);
        debug('api.getChannelFollowers', `Followers list: \n\t${followers.map(o => o.from_name)}`);

        if (followers.length === 100) {
          // move to next page
          return this.getChannelFollowers({ cursor: request.data.pagination.cursor, followers: opts.followers });
        } else {
          processFollowerState(opts.followers.map(f => {
            return {
              from_name: String(f.from_name).toLowerCase(),
              from_id: Number(f.from_id),
              followed_at: f.followed_at,
            };
          }));
        }
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`${url} - ${e.stack}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getChannelFollowers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
    }
    delete opts.cursor;
    return { state: true, opts };
  }

  async getGameFromId (id) {
    let request;
    const url = `https://api.twitch.tv/helix/games?id=${id}`;

    if (id.toString().trim().length === 0 || parseInt(id, 10) === 0) {
      return '';
    } // return empty game if gid is empty

    const gameFromDb = await getRepository(CacheGames).findOne({ id });

    // check if id is cached
    if (gameFromDb) {
      return gameFromDb.name;
    }

    try {
      const token = await oauth.botAccessToken;
      if (token === '') {
        throw new Error('token not available');
      }
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      if (isMainThread) {

        ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      }

      // add id->game to cache
      const name = request.data.data[0].name;
      await getRepository(CacheGames).save({ id, name });
      return name;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      warning(`Couldn't find name of game for gid ${id} - fallback to ${this.stats.currentGame}`);
      error(`API: ${url} - ${e.stack}`);
      if (isMainThread) {

        ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getGameFromId', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      }
      return this.stats.currentGame;
    }
  }

  async getCurrentStreamTags (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getCurrentStreamTags', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      if (request.status === 200 && !isNil(request.data.data[0])) {
        const tags = request.data.data;
        while (currentStreamTags.length) {
          currentStreamTags.pop();
        }
        for (const tag of tags) {
          currentStreamTags.push({
            is_auto: tag.is_auto, localization_names: tag.localization_names,
          });
        }
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getCurrentStreamTags', api: 'getCurrentStreamTags', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      return { state: false, opts };
    }
    return { state: true, opts };
  }

  async getCurrentStreamData (opts) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = this.calls.bot.remaining <= 30 && this.calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      setStatus('API', request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED);

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      let justStarted = false;

      debug('api.stream', 'API: ' + JSON.stringify(request.data));

      if (request.status === 200 && !isNil(request.data.data[0])) {
        // correct status and we've got a data - stream online
        const stream = request.data.data[0];

        if (!moment.preciseDiff(moment(stream.started_at), moment(this.streamStatusChangeSince), true).firstDateWasLater) {
          this.streamStatusChangeSince = (new Date(stream.started_at)).getTime();
        }
        if (!this.isStreamOnline || this.streamType !== stream.type) {
          this.chatMessagesAtStart = linesParsed;

          if (!webhooks.enabled.streams && Number(this.streamId) !== Number(stream.id)) {
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

            events.fire('stream-started', {});
            events.fire('command-send-x-times', { reset: true });
            events.fire('keyword-send-x-times', { reset: true });
            events.fire('every-x-minutes-of-stream', { reset: true });
            justStarted = true;

            for (const event of getFunctionList('streamStart')) {
              const type = !event.path.includes('.') ? 'core' : event.path.split('.')[0];
              const module = !event.path.includes('.') ? event.path.split('.')[0] : event.path.split('.')[1];
              const self = find(type, module);
              if (self) {
                self[event.fName]();
              } else {
                error(`streamStart: ${event.path} not found`);
              }
            }
          }
        }

        this.curRetries = 0;
        this.saveStreamData(stream);
        this.isStreamOnline = true;

        if (!justStarted) {
          // don't run events on first check
          events.fire('number-of-viewers-is-at-least-x', {});
          events.fire('stream-is-running-x-minutes', {});
          events.fire('every-x-minutes-of-stream', {});
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
            events.fire('stream-stopped', {});
            events.fire('stream-is-running-x-minutes', { reset: true });
            events.fire('number-of-viewers-is-at-least-x', { reset: true });

            for (const event of getFunctionList('streamEnd')) {
              const type = !event.path.includes('.') ? 'core' : event.path.split('.')[0];
              const module = !event.path.includes('.') ? event.path.split('.')[0] : event.path.split('.')[1];
              const self = find(type, module);
              if (self) {
                self[event.fName]();
              } else {
                error(`streamEnd: ${event.path} not found`);
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
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
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

    stats.save({
      timestamp: new Date().getTime(),
      whenOnline: this.isStreamOnline ? this.streamStatusChangeSince : null,
      currentViewers: this.stats.currentViewers,
      currentSubscribers: this.stats.currentSubscribers,
      currentFollowers: this.stats.currentFollowers,
      currentBits: this.stats.currentBits,
      currentTips: this.stats.currentTips,
      chatMessages: linesParsed - this.chatMessagesAtStart,
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
        if (await customvariables.isVariableSet(variable)) {
          value = await customvariables.getValueOf(variable);
        } else {
          value = translate('webpanel.not-available');
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
    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    if (needToWait) {
      setTimeout(() => this.setTags(sender, tagsArg), 1000);
      return;
    }

    try {
      const tag_ids: string[] = [];
      for (const tag of tagsArg) {
        const name = await getRepository(TwitchTagLocalizationName).findOne({
          where: {
            value: tag,
            tagId: Not(IsNull()),
          },
        });
        if (name && name.tagId) {
          tag_ids.push(name.tagId);
        }
      }

      const request = await axios({
        method: 'put',
        url,
        data: {
          tag_ids,
        },
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Client-ID': oauth.botClientId,
        },
      });
      await getRepository(TwitchTag).update({ is_auto: false }, { is_current: false });
      for (const tag_id of tag_ids) {
        await getRepository(TwitchTag).update({ tag_id }, { is_current: true });
      }
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'setTags', api: 'helix', endpoint: url, code: request.status, data: request.data });
    } catch (e) {
      error(`API: ${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'setTags', api: 'helix', endpoint: url, code: get(e, 'response.status', '500'), data: e.stack });
      return false;
    }


  }

  async setTitleAndGame (sender, args): Promise<{ response: string; status: boolean }> {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }

    args = defaults(args, { title: null }, { game: null });
    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/kraken/channels/${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    if (needToWait) {
      return { response: '', status: false };
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
      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: request.status });
    } catch (e) {
      error(`API: ${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'setTitleAndGame', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      return { response: '', status: false };
    }

    const responses: { response: string; status: boolean } = { response: '', status: false };

    if (request.status === 200 && !isNil(request.data)) {
      const response = request.data;
      if (!isNil(args.game)) {
        response.game = isNil(response.game) ? '' : response.game;
        if (response.game.trim() === args.game.trim()) {
          responses.response = translate('game.change.success').replace(/\$game/g, response.game);
          responses.status = true;
          events.fire('game-changed', { oldGame: this.stats.currentGame, game: response.game });
          this.stats.currentGame = response.game;
        } else {
          responses.response = translate('game.change.failed').replace(/\$game/g, this.stats.currentGame);
          responses.status = false;
        }
      }

      if (!isNull(args.title)) {
        if (response.status.trim() === status.trim()) {
          responses.response = translate('title.change.success').replace(/\$title/g, response.status);
          responses.status = true;
          this.stats.currentTitle = response.status;
        } else {
          responses.response = translate('title.change.failed').replace(/\$title/g, this.stats.currentTitle);
          responses.status = true;
        }
      }
      this.gameOrTitleChangedManually = true;
      this.retries.getCurrentStreamData = 0;
      return responses;
    }
    return { response: '', status: false };
  }

  async sendGameFromTwitch (self, socket, game) {
    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    const url = `https://api.twitch.tv/kraken/search/games?query=${encodeURIComponent(game)}&type=suggest`;

    const token = await oauth.botAccessToken;
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
        timeout: 20000,
      });
      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: request.status });
    } catch (e) {
      error(`API: ${url} - ${e.stack}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'sendGameFromTwitch', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
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

    const token = oauth.botAccessToken;
    if (token === '') {
      return { state: false };
    }

    let notCheckedClips = (await getRepository(TwitchClips).find({ isChecked: false }));

    // remove clips which failed
    for (const clip of filter(notCheckedClips, (o) => new Date(o.shouldBeCheckedAt).getTime() < new Date().getTime())) {
      await getRepository(TwitchClips).remove(clip);
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
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });

      for (const clip of request.data.data) {
        // clip found in twitch api
        await getRepository(TwitchClips).update({ clipId: clip.id }, { isChecked: true });
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`API: ${url} - ${e.stack}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
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
        const clip = await getRepository(TwitchClips).findOne({ clipId: id });
        if (!clip) {
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

    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
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
          'Client-ID': oauth.botClientId,
        },
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'createClip', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`API: ${url} - ${e.stack}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'createClip', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      return;
    }
    const clipId = request.data.data[0].id;
    await getRepository(TwitchClips).save({ clipId: clipId, isChecked: false, shouldBeCheckedAt: Date.now() + 120 * 1000 });
    return (await isClipChecked(clipId)) ? clipId : null;
  }

  async fetchAccountAge (id) {
    if (id === 0 || id === null || typeof id === 'undefined') {
      return;
    }

    if (!isMainThread) {
      throw new Error('API can run only on master');
    }
    const url = `https://api.twitch.tv/kraken/users/${id}`;

    const token = await oauth.botAccessToken;
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
        timeout: 20000,
      });
      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: request.status });
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') {
        return;
      } // ignore ECONNRESET errors

      let logError;
      try {
        logError = e.response.data.status !== 422;
      } catch (e2) {
        logError = true;
      }

      if (logError) {
        error(`API: ${url} - ${e.stack}`);

        ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'fetchAccountAge', api: 'kraken', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
      }
      return;
    }
    await getRepository(User).update({ userId: id }, { createdAt: new Date(request.data.created_at).getTime() });
  }

  async isFollowerUpdate (user: UserInterface | undefined) {
    if (!user || !user.userId) {
      return;
    }
    const id = user.userId;

    clearTimeout(this.timeouts['isFollowerUpdate-' + id]);

    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/users/follows?from_id=${id}&to_id=${cid}`;

    const token = await oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
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
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        this.calls.bot.remaining = 0;
        this.calls.bot.refresh = e.response.headers['ratelimit-reset'];
      }

      error(`API: ${url} - ${e.stack}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
      return null;
    }

    if (request.data.total === 0) {
      // not a follower
      // if was follower, fire unfollow event
      if (user.isFollower) {
        unfollow(user.username);
        events.fire('unfollow', { username: user.username });
      }

      await getRepository(User).update({ userId: user.userId },
        {
          followedAt: user.haveFollowedAtLock ? user.followedAt : 0,
          isFollower: user.haveFollowerLock? user.isFollower : false,
          followCheckAt: Date.now(),
        });
      return { isFollower: user.isFollower, followedAt: user.followedAt };
    } else {
      // is follower
      if (!user.isFollower && new Date().getTime() - new Date(request.data.data[0].followed_at).getTime() < 60000 * 60) {
        eventlist.add({
          event: 'follow',
          username: user.username,
          timestamp: Date.now(),
        });
        follow(user.username);
        events.fire('follow', { username: user.username, userId: id });
        alerts.trigger({
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

      await getRepository(User).update({ userId: user.userId },
        {
          followedAt: user.haveFollowedAtLock ? user.followedAt : Number(moment(request.data.data[0].followed_at).format('x')),
          isFollower: user.haveFollowerLock? user.isFollower : true,
          followCheckAt: Date.now(),
        });
      return { isFollower: user.isFollower, followedAt: user.followedAt };
    }
  }

  async createMarker () {
    const token = oauth.botAccessToken;
    const cid = oauth.channelId;

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
          'Client-ID': oauth.botClientId,
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

      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: url, code: request.status, remaining: this.calls.bot.remaining, data: request.data });
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') {
        return this.createMarker();
      }
      error(`API: Marker was not created - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: this.calls.bot.remaining });
    }
  }

  async getClipById (id) {
    const url = `https://api.twitch.tv/helix/clips/?id=${id}`;

    const token = await oauth.botAccessToken;
    if (token === '') {
      return null;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });
      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      return request.data;
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: `${e.status} ${get(e, 'body.message', e.statusText)}`, remaining: this.calls.bot.remaining });
      return null;
    }
  }

  async getTopClips (opts) {
    let url = 'https://api.twitch.tv/helix/clips?broadcaster_id=' + oauth.channelId;
    const token = oauth.botAccessToken;
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
          'Client-ID': oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      this.calls.bot.remaining = request.headers['ratelimit-remaining'];
      this.calls.bot.refresh = request.headers['ratelimit-reset'];
      this.calls.bot.limit = request.headers['ratelimit-limit'];

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.calls.bot.remaining });
      // get mp4 from thumbnail
      for (const c of request.data.data) {
        c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
        c.game = await this.getGameFromId(c.game_id);
      }
      return request.data.data;
    } catch (e) {
      error(`API: ${url} - ${e.stack}`);
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'getTopClips', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack });
    }
  }
}

export default new API();