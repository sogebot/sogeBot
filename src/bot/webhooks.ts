import axios from 'axios';
import config from '@config';
import util from 'util';
import { get, isNil } from 'lodash';

import { isBot } from './commons';
import { debug, error, follow, info, start, warning } from './helpers/log';
import { triggerInterfaceOnFollow } from './helpers/interface/triggers';

class Webhooks {
  enabled = {
    follows: false,
    streams: false,
  };
  timeouts: { [x: string]: NodeJS.Timeout} = {};
  cache: { id: string; type: string; timestamp: number }[] = [];

  constructor () {
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

    const cid = global.oauth.channelId;
    const clientId = await global.oauth.clientId;
    if (cid === '' || clientId === '') {
      this.timeouts[`unsubscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000);
      return;
    }

    // get proper domain
    const domains = config.panel.domain.split(',').map((o) => o.trim()).filter((o) => o !== 'localhost');
    if (domains.length === 0) {
      return;
    }
    const domain = domains[0];

    const mode = 'unsubscribe';
    const callback = `http://${domain}/webhooks/hub`;

    switch (type) {
      case 'follows':
        await axios({
          method: 'post',
          url: 'https://api.twitch.tv/helix/webhooks/hub',
          headers: {
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

    const cid = global.oauth.channelId;
    const clientId = await global.oauth.clientId;
    if (cid === '' || clientId === '') {
      this.timeouts[`subscribe-${type}`] = setTimeout(() => this.subscribe(type), 1000);
      return;
    }

    // get proper domain
    const domains = config.panel.domain.split(',').map((o) => o.trim()).filter((o) => o !== 'localhost');
    if (domains.length === 0) {
      return warning(`No suitable domain found to use with ${type} webhook ... localhost is not suitable`);
    }
    const domain = domains[0];

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
    if (get(aEvent, 'topic', null) === `https://api.twitch.tv/helix/users/follows?first=1&to_id=${global.oauth.channelId}`) {
      this.follower(aEvent);
    } else if (get(!isNil(aEvent.data[0]) ? aEvent.data[0] : {}, 'type', null) === 'live') {
      this.stream(aEvent);
    }

    res.sendStatus(200);
  }

  async challenge (req, res) {
    const cid = global.oauth.channelId;
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
  async follower (aEvent) {
    try {
      const cid = global.oauth.channelId;
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
      if (this.existsInCache('follow', data.from_id)) {
        return;
      }

      // add to cache
      this.addIdToCache('follow', data.from_id);

      const user = await global.users.getById(data.from_id);

      data.from_name = String(data.from_name).toLowerCase();
      user.username = data.from_name;
      global.db.engine.update('users', { id: data.from_id }, { username: data.from_name });

      if (!get(user, 'is.follower', false) && (get(user, 'time.follow', 0) === 0 || Date.now() - get(user, 'time.follow', 0) > 60000 * 60)) {
        if (!(await isBot(data.from_name))) {
          global.overlays.eventlist.add({
            type: 'follow',
            username: data.from_name,
            timestamp: Date.now(),
          });
          follow(data.from_name);
          global.events.fire('follow', { username: data.from_name, webhooks: true });
          global.registries.alerts.trigger({
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

      if (!get(user, 'is.follower', false)) {
        global.db.engine.update('users', { id: data.from_id }, { username: data.from_name, time: { followCheck: new Date().getTime() } });
      } else {
        const followedAt = user.lock && user.lock.followed_at ? Number(user.time.follow) : Date.now();
        const isFollower = user.lock && user.lock.follower ? user.is.follower : true;
        global.db.engine.update('users', { id: data.from_id }, { username: data.from_name, is: { follower: isFollower }, time: { followCheck: new Date().getTime(), follow: followedAt } });
      }
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
    const cid = global.oauth.channelId;
    if (cid === '') {
      setTimeout(() => this.stream(aEvent), 1000);
    } // wait until channelId is set

    // stream is online
    if (aEvent.data.length > 0) {
      const stream = aEvent.data[0];

      if (parseInt(stream.user_id, 10) !== parseInt(cid, 10) || Number(stream.id) === Number(global.api.streamId)) {
        return;
      }

      // Always keep this updated
      global.api.streamStatusChangeSince = (new Date(stream.started_at)).getTime();
      global.api.streamId = stream.id;
      global.api.streamType = stream.type;

      global.api.stats.currentTitle = stream.title;
      global.api.stats.currentGame = await global.api.getGameFromId(stream.game_id);

      if (!(global.api.isStreamOnline) && Number(global.twitch.streamId) !== Number(stream.id)) {
        debug('webhooks.stream', 'WEBHOOKS: ' + JSON.stringify(aEvent));
        start(
          `id: ${stream.id} | startedAt: ${stream.started_at} | title: ${stream.title} | game: ${await global.api.getGameFromId(stream.game_id)} | type: ${stream.type} | channel ID: ${cid}`
        );

        global.api.isStreamOnline = true;
        global.api.chatMessagesAtStart = global.linesParsed;

        global.events.fire('stream-started', {});
        global.events.fire('command-send-x-times', { reset: true });
        global.events.fire('keyword-send-x-times', { reset: true });
        global.events.fire('every-x-minutes-of-stream', { reset: true });
      }

      global.api.curRetries = 0;
      global.api.saveStreamData(stream);
      global.api.streamId = stream.id;
      global.api.streamType = stream.type;
    } else {
      // stream is offline - add curRetry + 1
      global.api.curRetries = global.api.curRetries + 1;
    }
  }
}

export default Webhooks;
export { Webhooks };
