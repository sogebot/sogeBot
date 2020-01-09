import 'module-alias/register';

import moment from 'moment-timezone';
require('moment-precise-range-plugin');

import { isMainThread } from './cluster';
import { isNil } from 'lodash';

import { getTime, isIgnored, prepare, sendMessage } from './commons';
import { command, default_permission, settings } from './decorators';
import { permission } from './helpers/permissions';
import Core from './_interface';


import * as configFile from '@config';
import { adminEndpoint } from './helpers/socket';

import { getRepository } from 'typeorm';
import { EventList } from './database/entity/eventList';

import { User } from './database/entity/user';
import api from './api';
import oauth from './oauth';
import { translate } from './translate';
import general from './general';

const config = configFile as any;
config.timezone = config.timezone === 'system' || isNil(config.timezone) ? moment.tz.guess() : config.timezone;

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
      cb((oauth.broadcasterUsername).toLowerCase());
    });
  }

  @command('!uptime')
  async uptime (opts) {
    const time = getTime(api.streamStatusChangeSince, true) as any;
    sendMessage(translate(api.isStreamOnline ? 'uptime.online' : 'uptime.offline')
      .replace(/\$days/g, time.days)
      .replace(/\$hours/g, time.hours)
      .replace(/\$minutes/g, time.minutes)
      .replace(/\$seconds/g, time.seconds), opts.sender);
  }

  @command('!time')
  async time (opts) {
    const message = await prepare('time', { time: moment().tz(config.timezone).format('LTS') });
    sendMessage(message, opts.sender);
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

    const message = await prepare('followers', {
      lastFollowAgo: lastFollowAgo,
      lastFollowUsername: lastFollowUsername,
      onlineFollowersCount: onlineFollowers.length,
    });
    sendMessage(message, opts.sender);
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

    const message = await prepare('subs', {
      lastSubAgo: lastSubAgo,
      lastSubUsername: lastSubUsername,
      onlineSubCount: onlineSubscribers.length,
    });
    sendMessage(message, opts.sender);
  }

  @command('!title')
  async getTitle (opts) {
    sendMessage(translate('title.current')
      .replace(/\$title/g, api.stats.currentTitle || 'n/a'), opts.sender);
  }

  @command('!title set')
  @default_permission(permission.CASTERS)
  async setTitle (opts) {
    if (opts.parameters.length === 0) {
      sendMessage(translate('title.current')
        .replace(/\$title/g, api.stats.currentTitle || 'n/a'), opts.sender);
      return;
    }
    api.setTitleAndGame(opts.sender, { title: opts.parameters });
  }

  @command('!game')
  async getGame (opts) {
    sendMessage(translate('game.current')
      .replace(/\$game/g, api.stats.currentGame || 'n/a'), opts.sender);
  }

  @command('!game set')
  @default_permission(permission.CASTERS)
  async setGame (opts) {
    if (opts.parameters.length === 0) {
      sendMessage(translate('game.current')
        .replace(/\$game/g, api.stats.currentGame || 'n/a'), opts.sender);
      return;
    }
    const games = await api.sendGameFromTwitch (api, null, opts.parameters);
    if (Array.isArray(games) && games.length > 0) {
      api.setTitleAndGame(opts.sender, { game: games[0] });
    }
  }
}

export default new Twitch();
