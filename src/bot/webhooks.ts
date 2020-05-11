import axios from 'axios';
import util from 'util';
import { get, isNil } from 'lodash';
import { setTimeout } from 'timers';

import { isBot } from './commons';
import { debug, error, follow, info, start } from './helpers/log';
import { triggerInterfaceOnFollow } from './helpers/interface/triggers';
import { getRepository } from 'typeorm';
import { User } from './database/entity/user';
import api from './api';
import events from './events';
import oauth from './oauth';
import ui from './ui';
import alerts from './registries/alerts';
import eventlist from './overlays/eventlist';
import { linesParsed } from './helpers/parser';

class Webhooks {
  enabled = {
    follows: false,
    streams: false,
  };
  timeouts: { [x: string]: NodeJS.Timeout} = {};
  cache: { id: string; type: string; timestamp: number }[] = [];

  subscribeAll() {
    this.unsubscribe('follows').then(() => this.subscribe('follows'));
    this.unsubscribe('streams').then(() => this.subscribe('streams'));
    this.clearCache();
  }

  addIdToCache (type, id) {
    this.cache.push({
      id: id,
      type: type,
      timestamp: Date.now(),
    });
  }

  clearCache () {
    clearTimeout(this.timeouts.clearCache);
    this.cache = this.cache.filter((o) => o.timestamp >= Date.now() - 600000);
    setTimeout(() => this.clearCache, 600000);
  }

  existsInCache (type, id) {
    return typeof this.cache.find((o) => o.type === type && o.id === id) !== 'undefined';
  }

  async unsubscribe (type) {
    clearTimeout(this.timeouts[`unsubscribe-${type}`]);

    const cid = oauth.channelId;
    const clientId = oauth.botClientId;
    const token = oauth.botAccessToken;
    if (cid === '' || clientId === '' || token === '') {
      this.timeouts[`unsubscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000);
      return;
    }

    const domain = ui.domain;
    if (domain.includes('localhost')) {
      return;
    }

    const mode = 'unsubscribe';
    const callback = `http://${domain}/webhooks/hub`;

    switch (type) {
      case 'follows':
        await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID': clientId,
            'Content-Type': 'application/json',
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`,
          },
        });
        break;
      case 'streams':
        await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID': clientId,
            'Content-Type': 'application/json',
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/streams?user_id=${cid}`,
          },
        });
        break;
    }
  }

  async subscribe (type) {
    clearTimeout(this.timeouts[`subscribe-${type}`]);

    const cid = oauth.channelId;
    const clientId = oauth.botClientId;
    const token = oauth.botAccessToken;
    if (cid === '' || clientId === '' || token === '') {
      this.timeouts[`subscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000);
      return;
    }

    const domain = ui.domain;
    if (domain.includes('localhost')) {
      return;
    }

    const leaseSeconds = 864000;
    const mode = 'subscribe';
    const callback = `http://${domain}/webhooks/hub`;

    let res;
    switch (type) {
      case 'follows':
        res = await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID': clientId,
            'Content-Type': 'application/json',
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/users/follows?first=1&to_id=${cid}`,
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
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID': clientId,
            'Content-Type': 'application/json',
          },
          data: {
            'hub.callback': `${callback}/${type}`,
            'hub.mode': mode,
            'hub.topic': `https://api.twitch.tv/helix/streams?user_id=${cid}`,
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

  async event (aEvent, res) {
    // somehow stream doesn't have a topic
    if (get(aEvent, 'topic', null) === `https://api.twitch.tv/helix/users/follows?first=1&to_id=${oauth.channelId}`) {
      this.follower(aEvent);
    } else if (get(!isNil(aEvent.data[0]) ? aEvent.data[0] : {}, 'type', null) === 'live') {
      this.stream(aEvent);
    }

    res.sendStatus(200);
  }

  async challenge (req, res) {
    const cid = oauth.channelId;
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
    res.send(req.query['hub.challenge']);
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
  async follower (aEvent, skipCacheCheck = false) {
    try {
      const cid = oauth.channelId;
      const data = aEvent.data;
      data.from_id = Number(data.from_id);

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
        if (this.existsInCache('follow', data.from_id)) {
          return;
        }

        // add to cache
        this.addIdToCache('follow', data.from_id);
      }

      const user = await getRepository(User).findOne({ userId: data.from_id });
      if (!user) {
        await getRepository(User).save({
          userId: Number(data.from_id),
          username: data.from_name.toLowerCase(),
        });
        this.follower(aEvent, true);
        return;
      }

      if (!user.isFollower && (user.followedAt === 0 || Date.now() - user.followedAt > 60000 * 60)) {
        if (!isBot(data.from_name)) {
          eventlist.add({
            event: 'follow',
            username: data.from_name,
            timestamp: Date.now(),
          });
          follow(data.from_name);
          events.fire('follow', { username: data.from_name, userId: data.from_id, webhooks: true });
          alerts.trigger({
            event: 'follows',
            name: data.from_name,
            amount: 0,
            currency: '',
            monthsName: '',
            message: '',
            autohost: false,
          });

          triggerInterfaceOnFollow({
            username: data.from_name,
            userId: data.from_id,
          });
        }
      }

      await getRepository(User).save({
        ...user,
        isFollower: user.haveFollowerLock? user.isFollower : true,
        followedAt: user.haveFollowedAtLock ? user.followedAt : Date.now(),
        followCheckAt: Date.now(),
      });
    } catch (e) {
      error(e.stack);
      error(util.inspect(aEvent));
    }
  }

  /*
    Example aEvent payload
    {
      "data":
        [{
          "id":"0123456789",
          "user_id":"5678",
          "game_id":"21779",
          "community_ids":[],
          "type":"live",
          "title":"Best Stream Ever",
          "viewer_count":417,
          "started_at":"2017-12-01T10:09:45Z",
          "language":"en",
          "thumbnail_url":"https://link/to/thumbnail.jpg"
        }]
    }
  */
  async stream (aEvent) {
    const cid = oauth.channelId;
    if (cid === '') {
      setTimeout(() => this.stream(aEvent), 1000);
    } // wait until channelId is set

    // stream is online
    if (aEvent.data.length > 0) {
      const stream = aEvent.data[0];

      if (parseInt(stream.user_id, 10) !== parseInt(cid, 10)) {
        return;
      }

      if (Number(api.streamId) !== Number(stream.id)) {
        debug('webhooks.stream', 'WEBHOOKS: ' + JSON.stringify(aEvent));
        start(
          `id: ${stream.id} | webhooks | startedAt: ${stream.started_at} | title: ${stream.title} | game: ${await api.getGameFromId(stream.game_id)} | type: ${stream.type} | channel ID: ${cid}`
        );

        // reset quick stats on stream start
        api.stats.currentWatchedTime = 0;
        api.stats.maxViewers = 0;
        api.stats.newChatters = 0;
        api.stats.currentViewers = 0;
        api.stats.currentBits = 0;
        api.stats.currentTips = 0;

        api.isStreamOnline = true;
        api.chatMessagesAtStart = linesParsed;

        events.fire('stream-started', {});
        events.fire('command-send-x-times', { reset: true });
        events.fire('keyword-send-x-times', { reset: true });
        events.fire('every-x-minutes-of-stream', { reset: true });
      }

      // Always keep this updated
      api.streamStatusChangeSince = (new Date(stream.started_at)).getTime();
      api.streamId = stream.id;
      api.streamType = stream.type;

      api.stats.currentTitle = stream.title;
      api.stats.currentGame = await api.getGameFromId(stream.game_id);

      api.curRetries = 0;
      api.saveStreamData(stream);
      api.streamId = stream.id;
      api.streamType = stream.type;
    } else {
      // stream is offline - add curRetry + 1
      api.curRetries = api.curRetries + 1;
    }
  }
}

export default new Webhooks();
