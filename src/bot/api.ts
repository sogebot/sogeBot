import querystring from 'querystring';
import { setTimeout } from 'timers';

import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';
import {
  chunk, defaults, filter, get, isNil,
} from 'lodash';
import {
  getManager, getRepository, In, IsNull, Not,
} from 'typeorm';

import Core from './_interface';
import * as constants from './constants';
import { ThreadEvent } from './database/entity/threadEvent';
import {
  TwitchClips, TwitchTag, TwitchTagLocalizationDescription, TwitchTagLocalizationName,
} from './database/entity/twitch';
import { User, UserInterface } from './database/entity/user';
import { onStartup } from './decorators/on';
import {
  stats as apiStats, calls, chatMessagesAtStart, currentStreamTags, emptyRateLimit, gameCache, gameOrTitleChangedManually, isStreamOnline, rawStatus, setRateLimit, streamStatusChangeSince,
} from './helpers/api';
import { parseTitle } from './helpers/api/parseTitle';
import {
  curRetries, maxRetries, retries, setCurrentRetries,
} from './helpers/api/retries';
import { streamId } from './helpers/api/streamId';
import { streamType } from './helpers/api/streamType';
import * as stream from './helpers/core/stream';
import { isDbConnected } from './helpers/database';
import { dayjs } from './helpers/dayjs';
import { eventEmitter } from './helpers/events';
import { getBroadcaster } from './helpers/getBroadcaster';
import { triggerInterfaceOnFollow } from './helpers/interface/triggers';
import {
  debug, error, follow, info, unfollow, warning,
} from './helpers/log';
import { channelId, loadedTokens } from './helpers/oauth';
import { botId } from './helpers/oauth/botId';
import { broadcasterId } from './helpers/oauth/broadcasterId';
import { ioServer } from './helpers/panel';
import { addUIError } from './helpers/panel/';
import { linesParsed, setStatus } from './helpers/parser';
import { logAvgTime } from './helpers/profiler';
import { setImmediateAwait } from './helpers/setImmediateAwait';
import { SQLVariableLimit } from './helpers/sql';
import {
  isBot, isBotId, isBotSubscriber,
} from './helpers/user/isBot';
import { isIgnored } from './helpers/user/isIgnored';
import { getChannelChattersUnofficialAPI } from './microservices/getChannelChattersUnofficialAPI';
import { getCustomRewards } from './microservices/getCustomRewards';
import { getGameNameFromId } from './microservices/getGameNameFromId';
import { setTitleAndGame } from './microservices/setTitleAndGame';
import { updateChannelViewsAndBroadcasterType } from './microservices/updateChannelViewsAndBroadcasterType';
import oauth from './oauth';
import eventlist from './overlays/eventlist';
import alerts from './registries/alerts';
import stats from './stats';
import twitch from './twitch';
import joinpart from './widgets/joinpart';

let latestFollowedAtTimestamp = 0;

const intervals = new Map<string, {
  interval: number;
  isDisabled: boolean;
  lastRunAt: number;
  opts: Record<string, any>;
}>();

type SubscribersEndpoint = { data: { broadcaster_id: string; broadcaster_name: string; is_gift: boolean; tier: string; plan_name: string; user_id: string; user_name: string; }[], pagination: { cursor: string } };
type FollowsEndpoint = { total: number; data: { from_id: string; from_name: string; to_id: string; toname: string; followed_at: string; }[], pagination: { cursor: string } };
export type StreamEndpoint = { data: { id: string; user_id: string, user_name: string, game_id: string, type: 'live' | '', title: string , viewer_count: number, started_at: string, language: string; thumbnail_url: string; tag_ids: string[] }[], pagination: { cursor: string } };

const updateFollowerState = async(users: Readonly<Required<UserInterface>>[], usersFromAPI: { from_name: string; from_id: string; followed_at: string }[], fullScale: boolean) => {
  if (!fullScale) {
    // we are handling only latest followers
    // handle users currently not following
    for (const user of users.filter(o => !o.isFollower)) {
      const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
      if (new Date().getTime() - new Date(apiUser.followed_at).getTime() < 2 * constants.HOUR) {
        if (user.followedAt === 0 || new Date().getTime() - user.followedAt > 60000 * 60) {
          eventlist.add({
            event:     'follow',
            userId:    user.userId,
            timestamp: Date.now(),
          });
          if (!isBot(user.username)) {
            follow(user.username);
            eventEmitter.emit('follow', { username: user.username, userId: user.userId });
            alerts.trigger({
              event:      'follows',
              name:       user.username,
              amount:     0,
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    '',
            });

            triggerInterfaceOnFollow({
              username: user.username,
              userId:   user.userId,
            });
          }
        }
      }
    }
  }
  await getRepository(User).save(
    users.map(user => {
      const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
      return {
        ...user,
        followedAt:    user.haveFollowedAtLock ? user.followedAt : new Date(apiUser.followed_at).getTime(),
        isFollower:    user.haveFollowerLock? user.isFollower : true,
        followCheckAt: Date.now(),
      };
    }),
    { chunk: Math.floor(SQLVariableLimit / Object.keys(users[0]).length) },
  );
};

const processFollowerState = async (users: { from_name: string; from_id: string; followed_at: string }[], fullScale = false) => {
  const timer = Date.now();
  if (users.length === 0) {
    debug('api.followers', `No followers to process.`);
    return;
  }
  debug('api.followers', `Processing ${users.length} followers`);
  const usersGotFromDb = (await Promise.all(
    chunk(users, SQLVariableLimit).map(async (bulk) => {
      return await getRepository(User).findByIds(bulk.map(user => user.from_id));
    }),
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
    await updateFollowerState([...usersSavedToDb, ...usersGotFromDb], users, fullScale);
  } else {
    await updateFollowerState(usersGotFromDb, users, fullScale);
  }
  debug('api.followers', `Finished parsing ${users.length} followers in ${Date.now() - timer}ms`);
};

class API extends Core {
  constructor () {
    super();
    this.addMenu({
      category: 'stats', name: 'api', id: 'stats/api', this: null,
    });
  }

  @onStartup()
  onStartup() {
    this.interval('getCurrentStreamData', constants.MINUTE);
    this.interval('getCurrentStreamTags', constants.MINUTE);
    this.interval('updateChannelViewsAndBroadcasterType', constants.HOUR);
    this.interval('getLatest100Followers', constants.MINUTE);
    this.interval('getChannelFollowers', constants.DAY);
    this.interval('getChannelSubscribers', 2 * constants.MINUTE);
    this.interval('getChannelChattersUnofficialAPI', 5 * constants.MINUTE);
    this.interval('getChannelInformation', constants.MINUTE);
    this.interval('checkClips', constants.MINUTE);
    this.interval('getAllStreamTags', constants.DAY);
    this.interval('getModerators', 10 * constants.MINUTE);

    // free thread_event
    getManager()
      .createQueryBuilder()
      .delete()
      .from(ThreadEvent)
      .where('event = :event', { event: 'getChannelChattersUnofficialAPI' })
      .execute();
  }

  interval(fnc: string, interval: number) {
    intervals.set(fnc, {
      interval, lastRunAt: 0, opts: {}, isDisabled: false,
    });
  }

  @onStartup()
  async intervalCheck () {
    let isBlocking: boolean | string = false;
    const check = async () => {
      if (isBlocking) {
        debug('api.interval', chalk.yellow(isBlocking + '() ') + 'still in progress.');
        return;
      }
      for (const fnc of intervals.keys()) {
        await setImmediateAwait();
        debug('api.interval', chalk.yellow(fnc + '() ') + 'check');
        if (loadedTokens.value < 2) {
          debug('api.interval', chalk.yellow(fnc + '() ') + 'tokens not loaded yet.');
          return;
        }
        let interval = intervals.get(fnc);
        if (!interval) {
          error(`Interval ${fnc} not found.`);
          continue;
        }
        if (interval.isDisabled) {
          debug('api.interval', chalk.yellow(fnc + '() ') + 'disabled');
          continue;
        }
        if (Date.now() - interval.lastRunAt >= interval.interval) {
          isBlocking = fnc;

          // run validation before any requests
          await oauth.validateOAuth('bot');
          await oauth.validateOAuth('broadcaster');

          debug('api.interval', chalk.yellow(fnc + '() ') + 'start');
          const time = process.hrtime();
          const time2 = Date.now();
          try {
            const value = await Promise.race<Promise<any>>([
              new Promise((resolve, reject) => {
                if (fnc === 'updateChannelViewsAndBroadcasterType') {
                  updateChannelViewsAndBroadcasterType()
                    .then((data: any) => resolve(data))
                    .catch((e) => reject(e));
                } else {
                  (this as any)[fnc](interval?.opts)
                    .then((data: any) => resolve(data))
                    .catch((e: any) => reject(e));
                }
              }),
              new Promise((_resolve, reject) => setTimeout(() => reject(), 10 * constants.MINUTE)),
            ]);
            logAvgTime(`api.${fnc}()`, process.hrtime(time));
            debug('api.interval', chalk.yellow(fnc + '(time: ' + (Date.now() - time2 + ') ') + JSON.stringify(value)));
            intervals.set(fnc, {
              ...interval,
              lastRunAt: Date.now(),
            });
            if (value.disable) {
              intervals.set(fnc, {
                ...interval,
                isDisabled: true,
              });
              debug('api.interval', chalk.yellow(fnc + '() ') + 'disabled');
              continue;
            }
            debug('api.interval', chalk.yellow(fnc + '() ') + 'done, value:' + JSON.stringify(value));

            interval = intervals.get(fnc); // refresh data
            if (!interval) {
              error(`Interval ${fnc} not found.`);
              continue;
            }

            if (value.state) { // if is ok, update opts and run unlock after a while
              intervals.set(fnc, {
                ...interval,
                opts: value.opts ?? {},
              });
            } else { // else run next tick
              intervals.set(fnc, {
                ...interval,
                opts:      value.opts ?? {},
                lastRunAt: 0,
              });
            }
          } catch (e) {
            warning(`API call for ${fnc} is probably frozen (took more than 10minutes), forcefully unblocking`);
            debug('api.interval', chalk.yellow(fnc + '() ') + e);
            continue;
          } finally {
            debug('api.interval', chalk.yellow(fnc + '() ') + 'unblocked.');
            isBlocking = false;
          }
        } else {
          debug('api.interval', chalk.yellow(fnc + '() ') + `skip run, lastRunAt: ${interval.lastRunAt}`  );
        }
      }
    };
    setInterval(check, 10000);
  }

  async getModerators(opts: { isWarned: boolean }) {
    const token = oauth.broadcasterAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = calls.broadcaster.remaining <= 30 && calls.broadcaster.refresh > Date.now() / 1000;
    const missingBroadcasterId = broadcasterId.value.length === 0;

    if (!oauth.broadcasterCurrentScopes.includes('moderation:read')) {
      if (!opts.isWarned) {
        opts.isWarned = true;
        warning('Missing Broadcaster oAuth scope moderation:read to read channel moderators.');
        addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope moderation:read to read channel moderators.' });
      }
      return { state: false, opts };
    }

    if ((needToWait || notEnoughAPICalls || missingBroadcasterId)) {
      return { state: false };
    }
    const url = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId.value}`;
    try {
      const request = await axios.request<{ pagination: any, data: { user_id: string; user_name: string }[] }>({
        method:  'get',
        url,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.broadcasterClientId,
          'Content-Type':  'application/json',
        },
      });

      // save remaining api calls
      setRateLimit('broadcaster', request.headers);

      const data = request.data.data;
      await getRepository(User).update({ userId: Not(In(data.map(o => o.user_id))) }, { isModerator: false });
      await getRepository(User).update({ userId: In(data.map(o => o.user_id)) }, { isModerator: true });

      setStatus('MOD', data.map(o => o.user_id).includes(botId.value));
    } catch (e) {
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getModerators', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.broadcaster,
        });
      } else {
        error(e.stack);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getModerators', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.broadcaster,
        });
      }
    }
    return { state: true };
  }

  async followerUpdatePreCheck (username: string) {
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

  async getUsernameFromTwitch (id: string) {
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

    const token = oauth.botAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if ((needToWait || notEnoughAPICalls)) {
      return null;
    }

    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
      return request.data.data[0].login;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    return null;
  }

  async getChannelChattersUnofficialAPI (opts: any) {
    const oAuthIsSet = oauth.botUsername.length > 0
      && channelId.value.length > 0
      && oauth.currentChannel.length > 0;

    if (!isDbConnected || !oAuthIsSet) {
      return { state: false, opts };
    }

    const event = await getRepository(ThreadEvent).findOne({ event: 'getChannelChattersUnofficialAPI' });
    if (typeof event === 'undefined') {
      const { partedUsers, joinedUsers } = await getChannelChattersUnofficialAPI();
      ioServer?.emit('api.stats', {
        method: 'GET', data: { partedUsers, joinedUsers }, timestamp: Date.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: `https://tmi.twitch.tv/group/user/${oauth.broadcasterUsername}/chatters`, code: 200, remaining: 'n/a',
      });

      joinpart.send({ users: partedUsers, type: 'part' });
      for (const username of partedUsers) {
        if (!isIgnored({ username: username })) {
          await setImmediateAwait();
          eventEmitter.emit('user-parted-channel', { username });
        }
      }

      joinpart.send({ users: joinedUsers, type: 'join' });
      for (const username of joinedUsers) {
        if (isIgnored({ username }) || oauth.botUsername === username) {
          continue;
        } else {
          await setImmediateAwait();
          this.followerUpdatePreCheck(username);
          eventEmitter.emit('user-joined-channel', { username });
        }
      }
    }
    return { state: true, opts };
  }

  async getAllStreamTags(opts: { cursor?: string }): Promise<{ state: boolean, opts: { cursor?: string} }> {
    let url = `https://api.twitch.tv/helix/tags/streams?first=100`;
    if (opts.cursor) {
      url += '&after=' + opts.cursor;
    }

    const token = oauth.botAccessToken;
    const needToWait = token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });
      const tags = request.data.data;

      (async function updateTags() {
        for(const tag of tags) {
          await setImmediateAwait();
          const localizationNames = await getRepository(TwitchTagLocalizationName).find({ tagId: tag.tag_id });
          const localizationDescriptions = await getRepository(TwitchTagLocalizationDescription).find({ tagId: tag.tag_id });
          await getRepository(TwitchTag).save({
            tag_id:             tag.tag_id,
            is_auto:            tag.is_auto,
            localization_names: Object.keys(tag.localization_names).map(key => {
              return {
                id:     localizationNames.find(o => o.locale === key && o.tagId === tag.tag_id)?.id,
                locale: key,
                value:  tag.localization_names[key],
              };
            }),
            localization_descriptions: Object.keys(tag.localization_descriptions).map(key => {
              return {
                id:     localizationDescriptions.find(o => o.locale === key && o.tagId === tag.tag_id)?.id,
                locale: key,
                value:  tag.localization_descriptions[key],
              };
            }),
          });
        }
        await getRepository(TwitchTagLocalizationDescription).delete({ tagId: IsNull() });
        await getRepository(TwitchTagLocalizationName).delete({ tagId: IsNull() });
      })();

      ioServer?.emit('api.stats', {
        method: 'GET', data: tags, timestamp: Date.now(), call: 'getAllStreamTags', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      if (request.data.pagination.cursor) {
        // move to next page
        return this.getAllStreamTags({ cursor: request.data.pagination.cursor });
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getAllStreamTags', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    delete opts.cursor;
    return { state: true, opts };

  }

  async getChannelSubscribers<T extends { cursor?: string; noAffiliateOrPartnerWarningSent?: boolean; notCorrectOauthWarningSent?: boolean; subscribers?: SubscribersEndpoint['data'] }> (opts: T): Promise<{ state: boolean; opts: T }> {
    opts = opts || {};

    const cid = channelId.value;
    let url = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${cid}&first=100`;
    if (opts.cursor) {
      url += '&after=' + opts.cursor;
    } else {
      // cursor is empty so we remove subscribers
      delete opts.subscribers;
    }

    const token = oauth.broadcasterAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.broadcaster.remaining <= 30 && calls.broadcaster.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls || oauth.broadcasterType === '') {
      if (oauth.broadcasterType === '') {
        if (!opts.noAffiliateOrPartnerWarningSent) {
          warning('Broadcaster is not affiliate/partner, will not check subs');
          apiStats.value.currentSubscribers = 0;
        }
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
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<SubscribersEndpoint>;
      const subscribers = request.data.data;
      if (opts.subscribers) {
        opts.subscribers = [...subscribers, ...opts.subscribers];
      } else {
        opts.subscribers = subscribers;
      }

      ioServer?.emit('api.stats', {
        method: 'GET', data: subscribers, timestamp: Date.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      // save remaining api calls
      setRateLimit('broadcaster', request.headers);

      if (request.data.pagination.cursor) {
        // move to next page
        return this.getChannelSubscribers({
          ...opts, cursor: request.data.pagination.cursor, subscribers: opts.subscribers,
        });
      } else {
        apiStats.value.currentSubscribers = opts.subscribers.length - 1; // exclude owner
        this.setSubscribers(opts.subscribers.filter(o => !isBotId(o.user_id)));
        if (opts.subscribers.find(o => isBotId(o.user_id))) {
          isBotSubscriber(true);
        } else {
          isBotSubscriber(false);
        }
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
        apiStats.value.currentSubscribers = 0;
      } else {
        error(`${url} - ${e.stack}`);

        ioServer?.emit('api.stats', {
          method: 'GET', timestamp: Date.now(), call: 'getChannelSubscribers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
        });
      }
    }
    delete opts.cursor;
    return { state: true, opts };
  }

  async setSubscribers (subscribers: SubscribersEndpoint['data']) {
    const currentSubscribers = await getRepository(User).find({ where: { isSubscriber: true } });

    // check if current subscribers are still subs
    for (const user of currentSubscribers) {
      if (!user.haveSubscriberLock && !subscribers
        .map((o) => String(o.user_id))
        .includes(String(user.userId))) {
        // subscriber is not sub anymore -> unsub and set subStreak to 0
        await getRepository(User).save({
          ...user,
          isSubscriber:    false,
          subscribeStreak: 0,
        });
      }
    }

    // update subscribers tier and set them active
    for (const user of subscribers) {
      const current = currentSubscribers.find(o => o.userId === user.user_id);
      const isNotCurrentSubscriber = !current;
      const valuesNotMatch = current && (current.subscribeTier !== String(Number(user.tier) / 1000) || current.isSubscriber === false);
      if (isNotCurrentSubscriber || valuesNotMatch) {
        await getRepository(User).update({ userId: user.user_id },
          {
            username:      user.user_name.toLowerCase(),
            isSubscriber:  true,
            subscribeTier: String(Number(user.tier) / 1000),
          });
      }
    }
  }

  async getChannelInformation (opts: any) {
    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    if (needToWait) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });
      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data.data, timestamp: Date.now(), call: 'getChannelInformation', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      if (!gameOrTitleChangedManually.value) {
        // Just polling update
        let _rawStatus = rawStatus.value;
        const title = await parseTitle(null);

        if (request.data.data[0].title !== title && retries.getChannelInformation === -1) {
          return { state: true, opts };
        } else if (request.data.data[0].title !== title && !opts.forceUpdate) {
          // check if title is same as updated title
          const numOfRetries = twitch.isTitleForced ? 1 : 5;
          if (retries.getChannelInformation >= numOfRetries) {
            retries.getChannelInformation = 0;

            // if we want title to be forced
            if (twitch.isTitleForced) {
              const game = gameCache.value;
              info(`Title/game force enabled => ${game} | ${_rawStatus}`);
              setTitleAndGame({});
              return { state: true, opts };
            } else {
              info(`Title/game changed outside of a bot => ${request.data.data[0].game_name} | ${request.data.data[0].title}`);
              retries.getChannelInformation = -1;
              _rawStatus = request.data.data[0].title;
            }
          } else {
            retries.getChannelInformation++;
            return { state: false, opts };
          }
        } else {
          retries.getChannelInformation = 0;
        }

        apiStats.value.language = request.data.data[0].broadcaster_language;
        apiStats.value.currentGame = request.data.data[0].game_name;
        apiStats.value.currentTitle = request.data.data[0].title;

        gameCache.value = request.data.data[0].game_name;
        rawStatus.value = _rawStatus;
      } else {
        gameOrTitleChangedManually.value = false;
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getChannelInformation', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
      return { state: false, opts };
    }

    retries.getChannelInformation = 0;
    return { state: true, opts };
  }

  async getLatest100Followers () {
    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`;
    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<FollowsEndpoint>;

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      if (request.status === 200 && !isNil(request.data.data)) {
        // we will go through only new users
        if (request.data.data.length > 0 && new Date(request.data.data[0].followed_at).getTime() !== latestFollowedAtTimestamp) {
          processFollowerState(request.data.data
            .filter(f => latestFollowedAtTimestamp < new Date(f.followed_at).getTime())
            .map(f => {
              return {
                from_name:   String(f.from_name).toLowerCase(),
                from_id:     String(f.from_id),
                followed_at: f.followed_at,
              };
            }));
          latestFollowedAtTimestamp = new Date(request.data.data[0].followed_at).getTime();
        } else {
          debug('api.followers', 'No new followers found.');
        }
      }
      apiStats.value.currentFollowers = request.data.total;
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }

      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getLatest100Followers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
      return { state: false };
    }
    return { state: true };
  }

  async getChannelFollowers (opts: { cursor?: string }) {
    opts = opts || {};

    const cid = channelId.value;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`;
    if (opts.cursor) {
      url += '&after=' + opts.cursor;
    } else {
      debug('api.getChannelFollowers', 'started');
    }

    try {
      const request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<FollowsEndpoint>;

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getChannelFollowers', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      if (request.status === 200 && !isNil(request.data.data)) {
        const followers = request.data.data;

        ioServer?.emit('api.stats', {
          method: 'GET', data: followers, timestamp: Date.now(), call: 'getChannelFollowers', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
        });

        debug('api.getChannelFollowers', `Followers loaded: ${followers.length}, cursor: ${request.data.pagination.cursor}`);
        debug('api.getChannelFollowers', `Followers list: \n\t${followers.map(o => o.from_name)}`);

        // process each 100 not full scale at once
        processFollowerState(followers.map(f => {
          return {
            from_name:   String(f.from_name).toLowerCase(),
            from_id:     String(f.from_id),
            followed_at: f.followed_at,
          };
        }), true).then(async () => {
          if (request.data.pagination.cursor) {
            // move to next page
            // we don't care about return
            setImmediateAwait().then(() => {
              this.getChannelFollowers({ cursor: request.data.pagination.cursor  });
            });
          }
        });
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }

      error(`${url} - ${e.stack}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getChannelFollowers', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    // return from first page (but we will still go through all pages)
    delete opts.cursor;
    return { state: true, opts };
  }

  async getCurrentStreamTags (opts: any) {
    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getCurrentStreamTags', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      if (request.status === 200 && !isNil(request.data.data[0])) {
        const tags = request.data.data;
        while (currentStreamTags.length) {
          currentStreamTags.pop();
        }
        for (const tag of tags) {
          currentStreamTags.push({ is_auto: tag.is_auto, localization_names: tag.localization_names });
        }
      }
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getCurrentStreamTags', api: 'getCurrentStreamTags', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
      return { state: false, opts };
    }
    return { state: true, opts };
  }

  async getCurrentStreamData (opts: any) {
    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<StreamEndpoint>;

      setStatus('API', request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED);

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      debug('api.stream', 'API: ' + JSON.stringify(request.data));

      if (request.status === 200 && request.data.data[0]) {
        // correct status and we've got a data - stream online
        const streamData = request.data.data[0];

        if (isStreamOnline.value) {
          eventEmitter.emit('every-x-minutes-of-stream', { reset: false } );
        }

        if (dayjs(streamData.started_at).valueOf() >=  dayjs(streamStatusChangeSince.value).valueOf()) {
          streamStatusChangeSince.value = (new Date(streamData.started_at)).getTime();
        }
        if (!isStreamOnline.value || streamType.value !== streamData.type) {
          if (Number(streamId.value) !== Number(streamData.id)) {
            debug('api.stream', 'API: ' + JSON.stringify(streamData));

            stream.end();
            stream.start(streamData);
          }
        }

        setCurrentRetries(0);
        this.saveStreamData(streamData);
      } else {
        if (isStreamOnline.value && curRetries < maxRetries) {
          // retry if it is not just some network / twitch issue
          setCurrentRetries(curRetries + 1);
        } else {
          stream.end();
        }
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }

      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getCurrentStreamData', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
      return { state: false, opts };
    }
    return { state: true, opts };
  }

  saveStreamData (streamData: StreamEndpoint['data'][number]) {
    apiStats.value.currentViewers = streamData.viewer_count;

    if (apiStats.value.maxViewers < streamData.viewer_count) {
      apiStats.value.maxViewers = streamData.viewer_count;
    }

    stats.save({
      timestamp:          new Date().getTime(),
      whenOnline:         isStreamOnline.value ? streamStatusChangeSince.value : Date.now(),
      currentViewers:     apiStats.value.currentViewers,
      currentSubscribers: apiStats.value.currentSubscribers,
      currentFollowers:   apiStats.value.currentFollowers,
      currentBits:        apiStats.value.currentBits,
      currentTips:        apiStats.value.currentTips,
      chatMessages:       linesParsed - chatMessagesAtStart.value,
      currentViews:       apiStats.value.currentViews,
      maxViewers:         apiStats.value.maxViewers,
      newChatters:        apiStats.value.newChatters,
      currentWatched:     apiStats.value.currentWatchedTime,
    });
  }

  async checkClips () {
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

    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if (notEnoughAPICalls) {
      return { state: false };
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      for (const clip of request.data.data) {
        // clip found in twitch api
        await getRepository(TwitchClips).update({ clipId: clip.id }, { isChecked: true });
      }
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.bot,
        });
      } else {
        error(e.stack);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
        });
      }
    }
    return { state: true };
  }

  async createClip (opts: any) {
    if (!(isStreamOnline.value)) {
      return;
    } // do nothing if stream is offline

    const isClipChecked = async function (id: string) {
      return new Promise((resolve: (value: boolean) => void) => {
        const check = async () => {
          const clip = await getRepository(TwitchClips).findOne({ clipId: id });
          if (!clip) {
            resolve(false);
          } else if (clip.isChecked) {
            resolve(true);
          } else {
            // not checked yet
            setTimeout(() => check(), 100);
          }
        };
        check();
      });
    };

    defaults(opts, { hasDelay: true });

    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/clips?broadcaster_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      setTimeout(() => this.createClip(opts), 1000);
      return;
    }

    let request;
    try {
      request = await axios({
        method:  'post',
        url,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'POST', data: request.data, timestamp: Date.now(), call: 'createClip', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }

      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'createClip', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.bot,
        });
      } else {
        error(e.stack);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'createClip', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
        });
      }
      return;
    }
    const clipId = request.data.data[0].id;
    await getRepository(TwitchClips).save({
      clipId: clipId, isChecked: false, shouldBeCheckedAt: Date.now() + 120 * 1000,
    });
    return (await isClipChecked(clipId)) ? clipId : null;
  }

  async fetchAccountAge (id?: string | null) {
    if (id === '0' || id === null || typeof id === 'undefined') {
      return;
    }

    const url = `https://api.twitch.tv/kraken/users/${id}`;

    const token = oauth.botAccessToken;
    if (token === '') {
      return;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Accept':        'application/vnd.twitchtv.v5+json',
          'Authorization': 'OAuth ' + token,
        },
        timeout: 20000,
      });
      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'fetchAccountAge', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
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
        if (e.isAxiosError) {
          error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
          ioServer?.emit('api.stats', {
            method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'fetchAccountAge', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.bot,
          });
        } else {
          error(e.stack);
          ioServer?.emit('api.stats', {
            method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'fetchAccountAge', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
          });
        }
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

    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/users/follows?from_id=${id}&to_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 40 && calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      this.timeouts['isFollowerUpdate-' + id] = setTimeout(() => this.isFollowerUpdate(user), 1000);
      return null;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
    } catch (e) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.bot,
        });
      } else {
        error(e.stack);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'isFollowerUpdate', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
        });
      }
      return null;
    }

    if (request.data.total === 0) {
      // not a follower
      // if was follower, fire unfollow event
      if (user.isFollower) {
        unfollow(user.username);
        eventEmitter.emit('unfollow', { username: user.username });
      }

      await getRepository(User).update({ userId: user.userId },
        {
          followedAt:    user.haveFollowedAtLock ? user.followedAt : 0,
          isFollower:    user.haveFollowerLock? user.isFollower : false,
          followCheckAt: Date.now(),
        });
      return { isFollower: user.isFollower, followedAt: user.followedAt };
    } else {
      // is follower
      if (!user.isFollower && new Date().getTime() - new Date(request.data.data[0].followed_at).getTime() < 60000 * 60) {
        eventlist.add({
          event:     'follow',
          userId:    String(id),
          timestamp: Date.now(),
        });
        follow(user.username);
        eventEmitter.emit('follow', { username: user.username, userId: id });
        alerts.trigger({
          event:      'follows',
          name:       user.username,
          amount:     0,
          tier:       null,
          currency:   '',
          monthsName: '',
          message:    '',
        });

        triggerInterfaceOnFollow({
          username: user.username,
          userId:   id,
        });
      }

      await getRepository(User).update({ userId: user.userId },
        {
          followedAt:    user.haveFollowedAtLock ? user.followedAt : dayjs(request.data.data[0].followed_at).valueOf(),
          isFollower:    user.haveFollowerLock? user.isFollower : true,
          followCheckAt: Date.now(),
        });
      return { isFollower: user.isFollower, followedAt: user.followedAt };
    }
  }

  async createMarker () {
    const token = oauth.botAccessToken;
    const cid = channelId.value;

    const url = 'https://api.twitch.tv/helix/streams/markers';
    try {
      if (token === '') {
        throw Error('missing bot accessToken');
      }
      if (cid === '') {
        throw Error('channel is not set');
      }

      const request = await axios({
        method:  'post',
        url,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        data: {
          user_id:     String(cid),
          description: 'Marked from sogeBot',
        },
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'POST', request: { data: { user_id: String(cid), description: 'Marked from sogeBot' } }, timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot, data: request,
      });
    } catch (e) {
      if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') {
        setTimeout(() => this.createMarker(), 1000);
        return;
      }
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.bot,
        });
      } else {
        error(e.stack);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
        });
      }
      ioServer?.emit('api.stats', {
        method: 'POST', request: { data: { user_id: String(cid), description: 'Marked from sogeBot' } }, timestamp: Date.now(), call: 'createMarker', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
  }

  async getClipById (id: string) {
    const url = `https://api.twitch.tv/helix/clips/?id=${id}`;

    const token = oauth.botAccessToken;
    if (token === '') {
      return null;
    }

    let request;
    try {
      request = await axios.get(url, {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });
      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
      return request.data;
    } catch (e) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getClipById', api: 'helix', endpoint: url, code: `${e.status} ${get(e, 'body.message', e.statusText)}`, remaining: calls.bot,
      });
      return null;
    }
  }

  async getCustomRewards() {
    const { headers, method, response, status, url, error: err } = await getCustomRewards();

    setRateLimit('broadcaster', headers);

    ioServer?.emit('api.stats', {
      method: method, data: response, timestamp: Date.now(), call: 'getCustomRewards', api: 'helix', endpoint: url, code: status, remaining: calls.broadcaster,
    });

    if (err) {
      throw err;
    }
    return response;
  }

  async getTopClips (opts: any) {
    let url = 'https://api.twitch.tv/helix/clips?broadcaster_id=' + channelId.value;
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
            started_at: (new Date(streamStatusChangeSince.value)).toISOString(),
            ended_at:   (new Date()).toISOString(),
          });
        } else {
          if (!opts.days || opts.days < 0) {
            throw Error('Days cannot be < 0');
          }
          url += '&' + querystring.stringify({
            started_at: (new Date((new Date()).setDate(-opts.days))).toISOString(),
            ended_at:   (new Date()).toISOString(),
          });
        }
      }
      if (opts.first) {
        url += '&first=' + opts.first;
      }

      const request = await axios.get(url, {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
      // get mp4 from thumbnail
      for (const c of request.data.data) {
        c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
        c.game = await getGameNameFromId(c.game_id);
      }
      return request.data.data;
    } catch (e) {
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getClipById', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.bot,
        });
      } else {
        error(e.stack);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getClipById', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
        });
      }
    }
  }
}

export default new API();