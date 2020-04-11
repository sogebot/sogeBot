import moment from 'moment-timezone';
require('moment-precise-range-plugin');

import { isMainThread } from './cluster';

import { getTime, isIgnored, prepare } from './commons';
import { command, default_permission, settings } from './decorators';
import { permission } from './helpers/permissions';
import Core from './_interface';


import { adminEndpoint } from './helpers/socket';

import { getRepository } from 'typeorm';
import { EventList } from './database/entity/eventList';

import { User } from './database/entity/user';
import api from './api';
import oauth from './oauth';
import { translate } from './translate';
import general from './general';

const timezone = (process.env.TIMEZONE ?? 'system') === 'system' || !process.env.TIMEZONE ? moment.tz.guess() : process.env.TIMEZONE;

class Twitch extends Core {
  @settings('general')
  isTitleForced = false;

  constructor () {
    super();

    if (isMainThread) {
      this.addWidget('twitch', 'widget-title-twitch', 'fab fa-twitch');
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'broadcaster', (cb) => {
      try {
        cb(null, (oauth.broadcasterUsername).toLowerCase());
      } catch (e) {
        cb(e.stack, '');
      }
    });
  }

  @command('!uptime')
  async uptime (opts) {
    const time = getTime(api.streamStatusChangeSince, true) as any;
    return [
      {
        response: await translate(api.isStreamOnline ? 'uptime.online' : 'uptime.offline')
          .replace(/\$days/g, time.days)
          .replace(/\$hours/g, time.hours)
          .replace(/\$minutes/g, time.minutes)
          .replace(/\$seconds/g, time.seconds),
        ...opts,
      },
    ];
  }

  @command('!time')
  async time (opts) {
    return [ { response: await prepare('time', { time: moment().tz(timezone).format('LTS') }), ...opts }];
  }

  @command('!followers')
  async followers (opts) {
    const events = await getRepository(EventList)
      .createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event = :event', { event: 'follow' })
      .getMany();
    const onlineFollowers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isFollower = :isFollower', { isFollower: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .getMany())
      .filter(o => {
        return !isIgnored({ username: o.username, userId: o.userId });
      });
    moment.locale(general.lang);

    let lastFollowAgo = '';
    let lastFollowUsername = 'n/a';
    if (events.length > 0) {
      lastFollowUsername = events[0].username;
      lastFollowAgo = moment(events[0].timestamp).fromNow();
    }

    const response = await prepare('followers', {
      lastFollowAgo: lastFollowAgo,
      lastFollowUsername: lastFollowUsername,
      onlineFollowersCount: onlineFollowers.length,
    });
    return [ { response, ...opts }];
  }

  @command('!subs')
  async subs (opts) {
    const events = await getRepository(EventList)
      .createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event = :event', { event: 'sub' })
      .orWhere('events.event = :event2', { event2: 'resub' })
      .orWhere('events.event = :event3', { event3: 'subgift' })
      .getMany();

    const onlineSubscribers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .getMany()).filter(o => {
      return !isIgnored({ username: o.username, userId: o.userId });
    });

    moment.locale(general.lang);

    let lastSubAgo = '';
    let lastSubUsername = 'n/a';
    if (events.length > 0) {
      lastSubUsername = events[0].username;
      lastSubAgo = moment(events[0].timestamp).fromNow();
    }

    const response = await prepare('subs', {
      lastSubAgo: lastSubAgo,
      lastSubUsername: lastSubUsername,
      onlineSubCount: onlineSubscribers.length,
    });
    return [ { response, ...opts }];
  }

  @command('!title')
  async getTitle (opts) {
    return [ { response: translate('title.current').replace(/\$title/g, api.stats.currentTitle || 'n/a'), ...opts }];
  }

  @command('!title set')
  @default_permission(permission.CASTERS)
  async setTitle (opts) {
    if (opts.parameters.length === 0) {
      return [ { response: await translate('title.current').replace(/\$title/g, api.stats.currentTitle || 'n/a'), ...opts }];
    }
    const status = await api.setTitleAndGame(opts.sender, { title: opts.parameters });
    return [ { response: status.response, ...opts }];
  }

  @command('!game')
  async getGame (opts) {
    return [ { response: translate('game.current').replace(/\$title/g, api.stats.currentGame || 'n/a'), ...opts }];
  }

  @command('!game set')
  @default_permission(permission.CASTERS)
  async setGame (opts) {
    if (opts.parameters.length === 0) {
      return [ { response: translate('game.current').replace(/\$title/g, api.stats.currentGame || 'n/a'), ...opts }];
    }
    const games = await api.sendGameFromTwitch (api, null, opts.parameters);
    if (Array.isArray(games) && games.length > 0) {
      const status = await api.setTitleAndGame(opts.sender, { game: games[0] });
      return [ { response: status.response, ...opts }];
    }
  }
}

export default new Twitch();
