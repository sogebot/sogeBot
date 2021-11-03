import querystring from 'querystring';

import { BannedEventsInterface, BannedEventsTable } from '@entity/bannedEvents';
import { ThreadEvent } from '@entity/threadEvent';
import {
  TwitchClips, TwitchTag, TwitchTagLocalizationDescription, TwitchTagLocalizationName,
} from '@entity/twitch';
import { User, UserInterface } from '@entity/user';
import * as constants from '@sogebot/ui-helpers/constants';
import axios, { AxiosResponse } from 'axios';
import {
  chunk, filter, get, isNil,
} from 'lodash';
import { getRepository, In, IsNull, Not } from 'typeorm';

import twitch from '../twitch';

import {
  stats as apiStats, calls, chatMessagesAtStart, currentStreamTags, emptyRateLimit, gameCache, gameOrTitleChangedManually, isStreamOnline, rawStatus, setRateLimit, streamStatusChangeSince,
} from '~/helpers/api';
import { parseTitle } from '~/helpers/api/parseTitle';
import {
  curRetries, maxRetries, retries, setCurrentRetries,
} from '~/helpers/api/retries';
import { streamId } from '~/helpers/api/streamId';
import { streamType } from '~/helpers/api/streamType';
import * as stream from '~/helpers/core/stream';
import { isDbConnected } from '~/helpers/database';
import { dayjs } from '~/helpers/dayjs';
import { eventEmitter } from '~/helpers/events';
import { follow } from '~/helpers/events/follow';
import { getBroadcaster } from '~/helpers/getBroadcaster';
import {
  debug, error, info, warning,
} from '~/helpers/log';
import { channelId } from '~/helpers/oauth';
import { botId } from '~/helpers/oauth/botId';
import { broadcasterId } from '~/helpers/oauth/broadcasterId';
import { ioServer } from '~/helpers/panel';
import { addUIError } from '~/helpers/panel/';
import { linesParsed, setStatus } from '~/helpers/parser';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import { SQLVariableLimit } from '~/helpers/sql';
import * as changelog from '~/helpers/user/changelog.js';
import { isBotId, isBotSubscriber } from '~/helpers/user/isBot';
import { isIgnored } from '~/helpers/user/isIgnored';
import { getChannelChattersUnofficialAPI } from '~/services/twitch/calls/getChannelChattersUnofficialAPI';
import { getCustomRewards } from '~/services/twitch/calls/getCustomRewards';
import { getGameNameFromId } from '~/services/twitch/calls/getGameNameFromId';
import { setTitleAndGame } from '~/services/twitch/calls/setTitleAndGame';
import stats from '~/stats';
import joinpart from '~/widgets/joinpart';

let latestFollowedAtTimestamp = 0;

type SubscribersEndpoint = { data: { broadcaster_id: string; broadcaster_name: string; is_gift: boolean; tier: string; plan_name: string; user_id: string; user_name: string; }[], pagination: { cursor: string } };
type FollowsEndpoint = { total: number; data: { from_id: string; from_name: string; to_id: string; toname: string; followed_at: string; }[], pagination: { cursor: string } };
export type StreamEndpoint = { data: { id: string; user_id: string, user_name: string, game_id: string, type: 'live' | '', title: string , viewer_count: number, started_at: string, language: string; thumbnail_url: string; tag_ids: string[] }[], pagination: { cursor: string } };
type getBannedEventsEndpoint = { data: BannedEventsInterface[], 'pagination': { 'cursor': string | null } };

const updateFollowerState = async(users: (Readonly<Required<UserInterface>>)[], usersFromAPI: { from_name: string; from_id: string; followed_at: string }[], fullScale: boolean) => {
  if (!fullScale) {
    // we are handling only latest followers
    // handle users currently not following
    for (const user of users.filter(o => !o.isFollower)) {
      const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
      if (new Date().getTime() - new Date(apiUser.followed_at).getTime() < 2 * constants.HOUR) {
        if (user.followedAt === 0 || new Date().getTime() - user.followedAt > 60000 * 60) {
          follow(user.userId, user.userName, user.followedAt);
        }
      }
    }
  }

  users.map(user => {
    const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
    return {
      ...user,
      followedAt:    user.haveFollowedAtLock ? user.followedAt : new Date(apiUser.followed_at).getTime(),
      isFollower:    user.haveFollowerLock? user.isFollower : true,
      followCheckAt: Date.now(),
    };
  }).forEach(user => {
    changelog.update(user.userId, user);
  });
};

const processFollowerState = async (users: { from_name: string; from_id: string; followed_at: string }[], fullScale = false) => {
  const timer = Date.now();
  if (users.length === 0) {
    debug('api.followers', `No followers to process.`);
    return;
  }
  debug('api.followers', `Processing ${users.length} followers`);
  await changelog.flush();
  const usersGotFromDb = (await Promise.all(
    chunk(users, SQLVariableLimit).map(async (bulk) => {
      return await getRepository(User).findByIds(bulk.map(user => user.from_id));
    }),
  )).flat();
  debug('api.followers', `Found ${usersGotFromDb.length} followers in database`);
  if (users.length > usersGotFromDb.length) {
    const usersSavedToDbPromise: Promise<Readonly<Required<UserInterface>>>[] = [];
    users
      .filter(user => !usersGotFromDb.find(db => db.userId === user.from_id))
      .map(user => {
        return { userId: user.from_id, userName: user.from_name };
      }).forEach(user => {
        changelog.update(user.userId, user);
        usersSavedToDbPromise.push(changelog.get(user.userId) as Promise<Readonly<Required<UserInterface>>>);
      });
    const usersSavedToDb = await Promise.all(usersSavedToDbPromise);
    await updateFollowerState([...usersSavedToDb, ...usersGotFromDb], users, fullScale);
  } else {
    await updateFollowerState(usersGotFromDb, users, fullScale);
  }
  debug('api.followers', `Finished parsing ${users.length} followers in ${Date.now() - timer}ms`);
};

class API {
  timeouts: { [x: string]: NodeJS.Timeout } = {};

  async getModerators(opts: { isWarned: boolean }) {
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
      setRateLimit('broadcaster', request.headers as any);

      const data = request.data.data;
      await changelog.flush();
      await getRepository(User).update({ userId: Not(In(data.map(o => o.user_id))) }, { isModerator: false });
      await getRepository(User).update({ userId: In(data.map(o => o.user_id)) }, { isModerator: true });

      setStatus('MOD', data.map(o => o.user_id).includes(botId.value));
    } catch (e: any) {
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
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

  async followerUpdatePreCheck (userName: string) {
    const user = await getRepository(User).findOne({ userName });
    if (user) {
      const isSkipped = user.userName === getBroadcaster() || user.userName === oauth.botUsername;
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
      request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getUsernameFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
      return request.data.data[0].login;
    } catch (e: any) {
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
        if (!isIgnored({ userName: username })) {
          await setImmediateAwait();
          eventEmitter.emit('user-parted-channel', { userName: username });
        }
      }

      joinpart.send({ users: joinedUsers, type: 'join' });
      for (const username of joinedUsers) {
        if (isIgnored({ userName: username }) || oauth.botUsername === username) {
          continue;
        } else {
          await setImmediateAwait();
          this.followerUpdatePreCheck(username);
          eventEmitter.emit('user-joined-channel', { userName: username });
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
      request = await axios.get<any>(url, {
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
      setRateLimit('bot', request.headers as any);

      if (request.data.pagination.cursor) {
        // move to next page
        return this.getAllStreamTags({ cursor: request.data.pagination.cursor });
      }
    } catch (e: any) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getAllStreamTags', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    delete opts.cursor;
    return { state: true, opts };

  }

  async getChannelSubscribers<T extends { cursor?: string; noAffiliateOrPartnerWarningSent?: boolean; notCorrectOauthWarningSent?: boolean; subscribers?: SubscribersEndpoint['data'] }> (opts: T): Promise<{ state: boolean; opts: T }> {
    opts = opts || {};

    const cid = await get<string>('/services/twitch', 'channelId');
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
      request = await axios.get<SubscribersEndpoint>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });
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
      setRateLimit('broadcaster', request.headers as any);

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
    } catch (e: any) {
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
    await changelog.flush();
    const currentSubscribers = await getRepository(User).find({ where: { isSubscriber: true } });

    // check if current subscribers are still subs
    for (const user of currentSubscribers) {
      if (!user.haveSubscriberLock && !subscribers
        .map((o) => String(o.user_id))
        .includes(String(user.userId))) {
        // subscriber is not sub anymore -> unsub and set subStreak to 0
        changelog.update(user.userId, {
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
        changelog.update(user.user_id, {
          userName:      user.user_name.toLowerCase(),
          isSubscriber:  true,
          subscribeTier: String(Number(user.tier) / 1000),
        });
      }
    }
  }

  async getChannelInformation (opts: any) {
    const cid = await get<string>('/services/twitch', 'channelId');
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    if (needToWait) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });
      // save remaining api calls
      setRateLimit('bot', request.headers as any);

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
              if ((process.env.NODE_ENV || 'development') !== 'production') {
                info(`Title/game force enabled (but disabled in debug mode) => ${game} | ${_rawStatus}`);
              } else {
                info(`Title/game force enabled => ${game} | ${_rawStatus}`);
                setTitleAndGame({});
              }
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
    } catch (e: any) {
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
    const cid = await get<string>('/services/twitch', 'channelId');
    const url = `https://api.twitch.tv/helix/users/follows?to_id=${cid}&first=100`;
    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;

    if (needToWait || notEnoughAPICalls) {
      return { state: false };
    }

    let request;
    try {
      request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<FollowsEndpoint>;

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

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
    } catch (e: any) {
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

    const cid = await get<string>('/services/twitch', 'channelId');

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
      const request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<FollowsEndpoint>;

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

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
    } catch (e: any) {
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
    const cid = await get<string>('/services/twitch', 'channelId');
    const url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

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
    } catch (e: any) {
      error(`${url} - ${e.message}`);
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getCurrentStreamTags', api: 'getCurrentStreamTags', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
      });
      return { state: false, opts };
    }
    return { state: true, opts };
  }

  async getBannedEvents (opts: any) {
    const cid = await get<string>('/services/twitch', 'channelId');
    const url = `https://api.twitch.tv/helix/moderation/banned/events?broadcaster_id=${cid}&first=100`;

    if (!oauth.broadcasterCurrentScopes.includes('moderation:read')) {
      if (!opts.isWarned) {
        opts.isWarned = true;
        warning('Missing Broadcaster oAuth scope moderation:read to read channel bans.');
        addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope moderation:read to read channel bans.' });
      }
      return { state: false, opts };
    }

    const token = oauth.broadcasterAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<getBannedEventsEndpoint>;

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getBannedEvents', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      // save to db
      for (const data of chunk(request.data.data, 50)) {
        getRepository(BannedEventsTable).save(data as BannedEventsInterface[]);
      }

      debug('api.stream', 'API: ' + JSON.stringify(request.data));
    } catch (e) {
      if (e instanceof Error) {
        error(`${url} - ${e.message}`);
        ioServer?.emit('api.stats', {
          method: 'GET', timestamp: Date.now(), call: 'getBannedEvents', api: 'helix', endpoint: url, code: 'n/a', data: e.stack, remaining: calls.bot,
        });
      }
    }

    return { state: true, opts };
  }

  async getCurrentStreamData (opts: any) {
    const cid = await get<string>('/services/twitch', 'channelId');
    const url = `https://api.twitch.tv/helix/streams?user_id=${cid}`;

    const token = oauth.botAccessToken;
    const needToWait = isNil(cid) || cid === '' || token === '';
    const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
    if (needToWait || notEnoughAPICalls) {
      return { state: false, opts };
    }

    let request;
    try {
      request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      }) as AxiosResponse<StreamEndpoint>;

      setStatus('API', request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED);

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

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
    } catch (e: any) {
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

  saveStreamData (streamData: StreamEndpoint['data'][number]) {
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
      request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'checkClips', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });

      for (const clip of request.data.data) {
        // clip found in twitch api
        await getRepository(TwitchClips).update({ clipId: clip.id }, { isChecked: true });
      }
    } catch (e: any) {
      if (typeof e.response !== 'undefined' && e.response.status === 429) {
        emptyRateLimit('bot', e.response.headers);
      }
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
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

  async getClipById (id: string) {
    const url = `https://api.twitch.tv/helix/clips/?id=${id}`;

    const token = oauth.botAccessToken;
    if (token === '') {
      return null;
    }

    let request;
    try {
      request = await axios.get<any>(url, {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });
      // save remaining api calls
      setRateLimit('bot', request.headers as any);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
      return request.data;
    } catch (e: any) {
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

      const request = await axios.get<any>(url, {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
        timeout: 20000,
      });

      // save remaining api calls
      setRateLimit('bot', request.headers as any);

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'getClipById', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
      });
      // get mp4 from thumbnail
      for (const c of request.data.data) {
        c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
        c.game = await getGameNameFromId(c.game_id);
      }
      return request.data.data;
    } catch (e: any) {
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
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

export default API;