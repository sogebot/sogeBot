import { setTimeout } from 'timers';
import util from 'util';

import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import axios from 'axios';
import { getRepository } from 'typeorm';

import type { StreamEndpoint } from './api';
import { User } from './database/entity/user';
import {
  chatMessagesAtStart, curRetries, isStreamOnline, stats, streamId, streamStatusChangeSince, streamType,
} from './helpers/api';
import { setCurrentRetries } from './helpers/api/';
import * as stream from './helpers/core/stream';
import { eventEmitter } from './helpers/events';
import { triggerInterfaceOnFollow } from './helpers/interface/triggers';
import {
  debug, error, follow, info,
} from './helpers/log';
import { channelId } from './helpers/oauth';
import { linesParsed } from './helpers/parser';
import { domain } from './helpers/ui';
import { isBot } from './helpers/user/isBot';
import { getGameNameFromId } from './microservices/getGameNameFromId';
import oauth from './oauth';
import eventlist from './overlays/eventlist';
import alerts from './registries/alerts';
import { default as coreStats } from './stats';

type Type = 'follows' | 'streams';

type followEvent = { data: { from_id: string, from_name: string, to_id: string, to_name: string, followed_at: string } };

class Webhooks {
  enabled = {
    follows: false,
    streams: false,
  };
  timeouts: { [x: string]: NodeJS.Timeout} = {};
  cache: { id: string; type: Type; timestamp: number }[] = [];

  subscribeAll() {
    this.unsubscribe('follows').then(() => this.subscribe('follows'));
    this.unsubscribe('streams').then(() => this.subscribe('streams'));
    this.clearCache();
  }

  addIdToCache (type: Type, id: string | number) {
    this.cache.push({
      id:        String(id),
      type:      type,
      timestamp: Date.now(),
    });
  }

  clearCache () {
    clearTimeout(this.timeouts.clearCache);
    this.cache = this.cache.filter((o) => o.timestamp >= Date.now() - 600000);
    setTimeout(() => this.clearCache, 600000);
  }

  existsInCache (type: Type, id: string | number) {
    return typeof this.cache.find((o) => o.type === type && o.id === String(id)) !== 'undefined';
  }

  async unsubscribe (type: Type) {
    clearTimeout(this.timeouts[`unsubscribe-${type}`]);

    const cid = channelId.value;
    const clientId = oauth.botClientId;
    const token = oauth.botAccessToken;
    if (cid === '' || clientId === '' || token === '') {
      this.timeouts[`unsubscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000);
      return;
    }

    if (domain.value.includes('localhost')) {
      return;
    }

    const mode = 'unsubscribe';
    const callback = `https://${domain.value}/webhooks/hub`;

    switch (type) {
      case 'follows':
        await axios({
          method:  'post',
          url:     'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID':     clientId,
            'Content-Type':  'application/json',
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode':     mode,
            'hub.topic':    `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`,
          },
        });
        break;
      case 'streams':
        await axios({
          method:  'post',
          url:     'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID':     clientId,
            'Content-Type':  'application/json',
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode':     mode,
            'hub.topic':    `https://api.twitch.tv/helix/streams?user_id=${cid}`,
          },
        });
        break;
    }
  }

  async subscribe (type: string) {
    clearTimeout(this.timeouts[`subscribe-${type}`]);

    const cid = channelId.value;
    const clientId = oauth.botClientId;
    const token = oauth.botAccessToken;
    if (cid === '' || clientId === '' || token === '') {
      this.timeouts[`subscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000);
      return;
    }

    if (domain.value.includes('localhost')) {
      return;
    }

    const leaseSeconds = 864000;
    const mode = 'subscribe';
    const callback = `https://${domain.value}/webhooks/hub`;

    let res;
    switch (type) {
      case 'follows':
        res = await axios({
          method:  'post',
          url:     'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID':     clientId,
            'Content-Type':  'application/json',
          },
          data: {
            'hub.callback':      `${callback}/${type}`,
            'hub.mode':          mode,
            'hub.topic':         `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`,
            'hub.lease_seconds': leaseSeconds,
          },
        });
        if (res.status === 202 && res.statusText === 'Accepted') {
          info('WEBHOOK: follows waiting for challenge');
        } else {
          error('WEBHOOK: follows NOT subscribed');
        }
        break;
      case 'streams':
        res = await axios({
          method:  'post',
          url:     'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID':     clientId,
            'Content-Type':  'application/json',
          },
          data: {
            'hub.callback':      `${callback}/${type}`,
            'hub.mode':          mode,
            'hub.topic':         `https://api.twitch.tv/helix/streams?user_id=${cid}`,
            'hub.lease_seconds': leaseSeconds,
          },
        });
        if (res.status === 202 && res.statusText === 'Accepted') {
          info('WEBHOOK: streams waiting for challenge');
        } else {
          error('WEBHOOK: streams NOT subscribed');
        }
        break;
      default:
        return; // don't resubcribe if subscription is not correct
    }

    // resubscribe after while
    this.timeouts[`subscribe-${type}`] = setTimeout(() => this.subscribe(type), leaseSeconds * 1000);
  }

  async challenge (req: any, res: any) {
    if (req.query['hub.mode'] === 'unsubscribe') {
      return;
    }

    const cid = channelId.value;
    // set webhooks enabled
    switch (req.query['hub.topic']) {
      case `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`:
        info('WEBHOOK: follows subscribed');
        this.enabled.follows = true;
        break;
      case `https://api.twitch.tv/helix/streams?user_id=${cid}`:
        info('WEBHOOK: streams subscribed');
        this.enabled.streams = true;
        break;
    }
    const queryChallenge = req.query['hub.challenge'];
    const escapedQueryChallenge = escape(queryChallenge);
    debug('webhooks.challenge', queryChallenge);
    debug('webhooks.challenge', escapedQueryChallenge);
    res.send(escapedQueryChallenge);
  }

  /*
  {
   "data":
      {
         "from_id":"1336",
         "from_name":"ebi",
         "to_id":"1337",
         "to_name":"oliver0823nagy",
         "followed_at": "2017-08-22T22:55:24Z"
      }
  }
  */
  async follower (aEvent: followEvent, skipCacheCheck = false) {
    try {
      const cid = channelId.value;
      const data = aEvent.data;

      if (Object.keys(cid).length === 0) {
        setTimeout(() => this.follower(aEvent), 10);
      } // wait until channelId is set
      if (parseInt(data.to_id, 10) !== parseInt(cid, 10)) {
        return;
      }

      if (typeof data.from_name === 'undefined') {
        throw TypeError('Username is undefined');
      }

      // is in webhooks cache
      if (!skipCacheCheck) {
        if (this.existsInCache('follows', data.from_id)) {
          return;
        }

        // add to cache
        this.addIdToCache('follows', data.from_id);
      }

      const user = await getRepository(User).findOne({ userId: data.from_id });
      if (!user) {
        await getRepository(User).save({
          userId:   data.from_id,
          username: data.from_name.toLowerCase(),
        });
        this.follower(aEvent, true);
        return;
      }

      if (!user.isFollower && (user.followedAt === 0 || Date.now() - user.followedAt > 60000 * 60)) {
        if (!isBot(data.from_name)) {
          eventlist.add({
            event:     'follow',
            userId:    data.from_id,
            timestamp: Date.now(),
          });
          follow(data.from_name);
          eventEmitter.emit('follow', {
            username: data.from_name, userId: data.from_id, webhooks: true,
          });
          alerts.trigger({
            event:      'follows',
            name:       data.from_name,
            amount:     0,
            tier:       null,
            currency:   '',
            monthsName: '',
            message:    '',
          });

          triggerInterfaceOnFollow({
            username: data.from_name,
            userId:   data.from_id,
          });
        }
      }

      await getRepository(User).save({
        ...user,
        isFollower:    user.haveFollowerLock? user.isFollower : true,
        followedAt:    user.haveFollowedAtLock ? user.followedAt : Date.now(),
        followCheckAt: Date.now(),
      });
    } catch (e) {
      error(e.stack);
      error(util.inspect(aEvent));
    }
  }

  async stream (aEvent: StreamEndpoint) {
    const cid = channelId.value;
    if (cid === '') {
      setTimeout(() => this.stream(aEvent), 1000);
    } // wait until channelId is set

    // stream is online
    if (aEvent.data.length > 0) {
      const streamEvent = aEvent.data[0];

      if (parseInt(streamEvent.user_id, 10) !== parseInt(cid, 10)) {
        return;
      }

      if (Number(streamId.value) !== Number(streamEvent.id)) {
        debug('webhooks.stream', 'WEBHOOKS: ' + JSON.stringify(aEvent));
        stream.end();
        stream.start(streamEvent, true);
      }

      // Always keep this updated
      streamStatusChangeSince.value = dayjs.utc(streamEvent.started_at).valueOf();
      streamId.value = streamEvent.id;
      streamType.value = streamEvent.type;
      stats.value.currentTitle = streamEvent.title;
      stats.value.currentGame = await getGameNameFromId(Number(streamEvent.game_id));

      setCurrentRetries(0);

      /* TODO: does we really need all of below it there? */
      stats.value.currentViewers = streamEvent.viewer_count;

      if (stats.value.maxViewers < streamEvent.viewer_count) {
        stats.value.maxViewers = streamEvent.viewer_count;
      }

      coreStats.save({
        timestamp:          new Date().getTime(),
        whenOnline:         isStreamOnline.value ? streamStatusChangeSince.value : Date.now(),
        currentViewers:     stats.value.currentViewers,
        currentSubscribers: stats.value.currentSubscribers,
        currentFollowers:   stats.value.currentFollowers,
        currentBits:        stats.value.currentBits,
        currentTips:        stats.value.currentTips,
        chatMessages:       linesParsed - chatMessagesAtStart.value,
        currentViews:       stats.value.currentViews,
        maxViewers:         stats.value.maxViewers,
        newChatters:        stats.value.newChatters,
        currentWatched:     stats.value.currentWatchedTime,
      });
    } else {
      // stream is offline - add curRetry + 1
      setCurrentRetries(curRetries + 1);
    }
  }
}

export default new Webhooks();
