import { EventList } from '@entity/eventList';
import { User } from '@entity/user';
import { getTime } from '@sogebot/ui-helpers/getTime';
import { getRepository } from 'typeorm';

import {
  command, default_permission, settings,
} from '../decorators';
import { onChange, onLoad, onStartup } from '../decorators/on';
import Expects from '../expects';
import { error } from '../helpers/log';
import users from '../users';
import Service from './_interface';
import oauth from './twitch/oauth';

import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api';
import { prepare } from '~/helpers/commons/prepare';
import { dayjs, timezone } from '~/helpers/dayjs';
import { defaultPermissions } from '~/helpers/permissions/';
import { adminEndpoint } from '~/helpers/socket';
import {
  globalIgnoreListExclude, ignorelist, sendWithMe, setMuteStatus, showWithAt,
} from '~/helpers/tmi';
import { tmiEmitter } from '~/helpers/tmi';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored';
import { sendGameFromTwitch } from '~/services/twitch/calls/sendGameFromTwitch';
import { setTitleAndGame } from '~/services/twitch/calls/setTitleAndGame';
import { translate } from '~/translate';

class Twitch extends Service {
  oauth: typeof import('./twitch/oauth').default;
  tmi: typeof import('./twitch/chat').default;

  @settings('general')
  isTitleForced = false;

  @settings('chat')
  sendWithMe = false;
  @settings('chat')
  sendAsReply = true;
  @settings('chat')
  ignorelist: any[] = [];
  @settings('chat')
  globalIgnoreListExclude: any[] = [];
  @settings('chat')
  showWithAt = true;
  @settings('chat')
  mute = false;
  @settings('chat')
  whisperListener = false;

  @onStartup()
  async onStartup() {
    this.oauth = (await import('./twitch/oauth')).default;
    this.tmi = (await import('./twitch/chat')).default;

    tmiEmitter.on('get::whisperListener', (cb) => cb(this.whisperListener));
  }

  @onChange('showWithAt')
  @onLoad('showWithAt')
  setShowWithAt() {
    showWithAt.value = this.showWithAt;
  }

  @onChange('sendWithMe')
  @onLoad('sendWithMe')
  setSendWithMe() {
    sendWithMe.value = this.sendWithMe;
  }

  @onChange('ignorelist')
  @onLoad('ignorelist')
  setIgnoreList() {
    ignorelist.value = this.ignorelist;
  }

  @onChange('globalIgnoreListExclude')
  @onLoad('globalIgnoreListExclude')
  setGlobalIgnoreListExclude() {
    globalIgnoreListExclude.value = this.globalIgnoreListExclude;
  }

  @onChange('mute')
  @onLoad('mute')
  setMuteStatus() {
    setMuteStatus(this.mute);
  }

  sockets() {
    adminEndpoint(this.nsp, 'broadcaster', (cb) => {
      try {
        cb(null, (oauth.broadcasterUsername).toLowerCase());
      } catch (e: any) {
        cb(e.stack, '');
      }
    });
  }

  @command('!uptime')
  async uptime (opts: CommandOptions) {
    const time = getTime(streamStatusChangeSince.value, true) as any;
    return [
      {
        response: await translate(isStreamOnline.value ? 'uptime.online' : 'uptime.offline')
          .replace(/\$days/g, time.days)
          .replace(/\$hours/g, time.hours)
          .replace(/\$minutes/g, time.minutes)
          .replace(/\$seconds/g, time.seconds),
        ...opts,
      },
    ];
  }

  @command('!ignore add')
  @default_permission(defaultPermissions.CASTERS)
  async ignoreAdd (opts: CommandOptions) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      this.ignorelist = [
        ...new Set([
          ...this.ignorelist,
          username,
        ],
        )];
      // update ignore list

      return [{ response: prepare('ignore.user.is.added', { username }), ...opts }];
    } catch (e: any) {
      error(e.stack);
    }
    return [];
  }

  @command('!ignore remove')
  @default_permission(defaultPermissions.CASTERS)
  async ignoreRm (opts: CommandOptions) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      this.ignorelist = this.ignorelist.filter(o => o !== username);
      // update ignore list
      return [{ response: prepare('ignore.user.is.removed', { username }), ...opts }];
    } catch (e: any) {
      error(e.stack);
    }
    return [];
  }

  @command('!ignore check')
  @default_permission(defaultPermissions.CASTERS)
  async ignoreCheck (opts: CommandOptions) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      const isUserIgnored = isIgnored({ userName: username });
      return [{ response: prepare(isUserIgnored ? 'ignore.user.is.ignored' : 'ignore.user.is.not.ignored', { username }), ...opts }];
    } catch (e: any) {
      error(e.stack);
    }
    return [];
  }

  @command('!time')
  async time (opts: CommandOptions) {
    return [ { response: prepare('time', { time: dayjs().tz(timezone).format('LTS') }), ...opts }];
  }

  @command('!followers')
  async followers (opts: CommandOptions) {
    const events = await getRepository(EventList)
      .createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event = :event', { event: 'follow' })
      .getMany();
    await changelog.flush();
    const onlineFollowers = (await getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isFollower = :isFollower', { isFollower: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .getMany())
      .filter(o => {
        return !isIgnored({ userName: o.userName, userId: o.userId });
      });

    let lastFollowAgo = '';
    let lastFollowUsername = 'n/a';
    if (events.length > 0) {
      lastFollowUsername = await users.getNameById(events[0].userId);
      lastFollowAgo = dayjs(events[0].timestamp).fromNow();
    }

    const response = prepare('followers', {
      lastFollowAgo:        lastFollowAgo,
      lastFollowUsername:   lastFollowUsername,
      onlineFollowersCount: onlineFollowers.length,
    });
    return [ { response, ...opts }];
  }

  @command('!subs')
  async subs (opts: CommandOptions) {
    const events = await getRepository(EventList)
      .createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event = :event', { event: 'sub' })
      .orWhere('events.event = :event2', { event2: 'resub' })
      .orWhere('events.event = :event3', { event3: 'subgift' })
      .getMany();
    await changelog.flush();
    const onlineSubscribers = (await getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .getMany()).filter(o => {
      return !isIgnored({ userName: o.userName, userId: o.userId });
    });

    let lastSubAgo = '';
    let lastSubUsername = 'n/a';
    if (events.length > 0) {
      lastSubUsername = await users.getNameById(events[0].userId);
      lastSubAgo = dayjs(events[0].timestamp).fromNow();
    }

    const response = prepare('subs', {
      lastSubAgo:      lastSubAgo,
      lastSubUsername: lastSubUsername,
      onlineSubCount:  onlineSubscribers.length,
    });
    return [ { response, ...opts }];
  }

  @command('!title')
  async getTitle (opts: CommandOptions) {
    return [ { response: translate('title.current').replace(/\$title/g, stats.value.currentTitle || 'n/a'), ...opts }];
  }

  @command('!title set')
  @default_permission(defaultPermissions.CASTERS)
  async setTitle (opts: CommandOptions) {
    if (opts.parameters.length === 0) {
      return [ { response: await translate('title.current').replace(/\$title/g, stats.value.currentTitle || 'n/a'), ...opts }];
    }
    const status = await setTitleAndGame({ title: opts.parameters });
    return status ? [ { response: status.response, ...opts } ] : [];
  }

  @command('!game')
  async getGame (opts: CommandOptions) {
    return [ { response: translate('game.current').replace(/\$title/g, stats.value.currentGame || 'n/a'), ...opts }];
  }

  @command('!game set')
  @default_permission(defaultPermissions.CASTERS)
  async setGame (opts: CommandOptions) {
    if (opts.parameters.length === 0) {
      return [ { response: translate('game.current').replace(/\$title/g, stats.value.currentGame || 'n/a'), ...opts }];
    }
    const games = await sendGameFromTwitch(opts.parameters);
    if (Array.isArray(games) && games.length > 0) {
      const exactMatchIdx = games.findIndex(name => name.toLowerCase() === opts.parameters.toLowerCase());
      const status = await setTitleAndGame({ game: games[exactMatchIdx !== -1 ? exactMatchIdx : 0] });
      return status ? [ { response: status.response, ...opts } ] : [];
    }
    return [{ response: translate('game.current').replace(/\$title/g, stats.value.currentGame || 'n/a'), ...opts }];
  }
}

export default new Twitch();
