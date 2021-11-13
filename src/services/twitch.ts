import { EventList } from '@entity/eventList';
import { User } from '@entity/user';
import * as constants from '@sogebot/ui-helpers/constants';
import { dayjs, timezone } from '@sogebot/ui-helpers/dayjsHelper';
import { getTime } from '@sogebot/ui-helpers/getTime';
import { getRepository } from 'typeorm';

import { CacheEmotes } from '../database/entity/cacheEmotes';
import {
  command, default_permission, parser, persistent, settings,
} from '../decorators';
import { onChange, onLoad, onStartup, onStreamStart } from '../decorators/on';
import Expects from '../expects';
import emitter from '../helpers/interfaceEmitter';
import { debug, error } from '../helpers/log';
import users from '../users';
import Service from './_interface';
import { init as apiIntervalInit , stop as apiIntervalStop } from './twitch/api/interval';
import { getChannelId } from './twitch/calls/getChannelId';
import Chat from './twitch/chat';
import Emotes from './twitch/emotes';
import EventSub from './twitch/eventsub';
import PubSub from './twitch/pubsub';
import { cache, validate } from './twitch/token/validate';

import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api';
import { prepare } from '~/helpers/commons/prepare';
import { isBotStarted } from '~/helpers/database';
import { setOAuthStatus } from '~/helpers/OAuthStatus';
import { cleanViewersCache } from '~/helpers/permissions';
import { defaultPermissions } from '~/helpers/permissions/index';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import {
  globalIgnoreListExclude, ignorelist, sendWithMe, setMuteStatus, showWithAt,
} from '~/helpers/tmi';
import { tmiEmitter } from '~/helpers/tmi';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored';
import { sendGameFromTwitch } from '~/services/twitch/calls/sendGameFromTwitch';
import { setTitleAndGame } from '~/services/twitch/calls/setTitleAndGame';
import { translate } from '~/translate';

const urls = {
  'SogeBot Token Generator': 'https://twitch-token-generator.soge.workers.dev/refresh/',
};

class Twitch extends Service {
  tmi: import('./twitch/chat').default | null;
  emotes: import('./twitch/emotes').default | null;
  pubsub: import('./twitch/pubsub').default | null;
  eventsub: import('./twitch/eventsub').default | null;

  @persistent()
    botTokenValid = false;
  @persistent()
    broadcasterTokenValid = false;

  @persistent()
    channelId = '';
  @persistent()
    currentChannel = '';

  @settings('general')
    isTitleForced = false;

  @settings('chat')
    sendWithMe = false;
  @settings('chat')
    sendAsReply = false;
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

  @settings('bot')
    botClientId = '';
  @settings('broadcaster')
    broadcasterClientId = '';

  @settings('general')
    tokenService: keyof typeof urls = 'SogeBot Token Generator';
  @settings('general')
    tokenServiceCustomClientId = '';
  @settings('general')
    tokenServiceCustomClientSecret = '';
  @settings('general')
    generalChannel = '';
  @settings('general')
    generalOwners: string[] = [];

  @settings('broadcaster')
    broadcasterAccessToken = '';
  @settings('broadcaster')
    broadcasterRefreshToken = '';
  @settings('broadcaster')
    broadcasterId = '';
  @settings('broadcaster')
    broadcasterUsername = '';
  @settings('broadcaster', true)
    broadcasterExpectedScopes: string[] = [
      'channel_editor',
      'chat:read',
      'chat:edit',
      'channel:moderate',
      'channel:read:subscriptions',
      'user:edit:broadcast',
      'user:read:broadcast',
      'channel:edit:commercial',
      'channel:read:redemptions',
      'moderation:read',
      'channel:read:hype_train',
    ];
  @settings('broadcaster')
    broadcasterCurrentScopes: string[] = [];

  @settings('bot')
    botAccessToken = '';
  @settings('bot')
    botRefreshToken = '';
  @settings('bot')
    botId = '';
  @settings('bot')
    botUsername = '';
  @settings('bot', true)
    botExpectedScopes: string[] = [
      'clips:edit',
      'user:edit:broadcast',
      'user:read:broadcast',
      'chat:read',
      'chat:edit',
      'channel:moderate',
      'whispers:read',
      'whispers:edit',
      'channel:edit:commercial',
    ];
  @settings('bot')
    botCurrentScopes: string[] = [];

  @settings('eventsub')
    useTunneling = false;
  @settings('eventsub')
    domain = '';
  @settings('eventsub')
    eventSubClientId = '';
  @settings('eventsub')
    eventSubClientSecret = '';
  @settings('eventsub')
    eventSubEnabledSubscriptions: string[] = [];
  @persistent()
    appToken = '';
  @persistent()
    secret = '';

  constructor() {
    super();
    this.botTokenValid = false;
    this.broadcasterTokenValid = false;
  }

  @onChange('botAccessToken')
  @onChange('broadcasterAccessToken')
  @onLoad('broadcasterAccessToken')
  @onLoad('botAccessToken')
  public async onChangeAccessToken(key: string, value: any) {
    if (!this.enabled) {
      return;
    }
    switch (key) {
      case 'broadcasterAccessToken':
        if (value === '') {
          cache.broadcaster = 'force_reconnect';
          emitter.emit('set', '/services/twitch', 'broadcasterUsername', '');
          tmiEmitter.emit('part', 'broadcaster');
        } else {
          validate('broadcaster', 0, true);
        }
        break;
      case 'botAccessToken':
        if (value === '') {
          cache.bot = 'force_reconnect';
          emitter.emit('set', '/services/twitch', 'botUsername', '');
          tmiEmitter.emit('part', 'bot');
        } else {
          validate('bot');
        }
        break;
    }
  }

  @onChange('generalOwners')
  @onChange('broadcasterUsername')
  clearCache() {
    cleanViewersCache();
  }

  @onChange('broadcasterUsername')
  @onChange('botUsername')
  setOAuthStatus() {
    setOAuthStatus('bot', this.botUsername === '');
    setOAuthStatus('broadcaster', this.broadcasterUsername === '');
  }

  @onChange('broadcasterUsername')
  public async onChangeBroadcasterUsername(key: string, value: any) {
    if (!this.generalOwners.includes(value)) {
      this.generalOwners.push(value);
    }
  }

  @onStartup()
  async onStartup() {
    emitter.on('services::twitch::emotes', (type, value) => {
      if (type === 'explode') {
        this.emotes?.explode(value);
      }
      if (type === 'firework') {
        this.emotes?.firework(value);
      }
    });

    this.addMenu({
      category: 'stats', name: 'api', id: 'stats/api', this: null,
    });

    this.onStatusChange();
  }

  init() {
    if (this.botTokenValid && this.broadcasterTokenValid) {
      getChannelId();

      this.tmi = new Chat();
      this.tmi?.initClient('bot');
      this.tmi?.initClient('broadcaster');

      this.pubsub = new PubSub();
      this.emotes = new Emotes();
      this.eventsub = new EventSub();
      apiIntervalInit();
    } else {
      setTimeout(() => this.init(), 1000);
    }
  }

  @onChange('enabled')
  onStatusChange() {
    if (!isBotStarted) {
      return;
    }
    if (this.enabled) {
      // trigger validation
      this.validateTokens();
      this.init();
    } else {
      apiIntervalStop();
      if (this.emotes) {
        clearInterval(this.emotes.interval);
      }
      this.pubsub?.stop();
      this.tmi?.part('bot');
      this.tmi?.part('broadcaster');

      this.emotes = null;
      this.pubsub = null;
      this.eventsub = null;
    }
  }

  validateTokens() {
    debug('oauth.validate', 'Triggering token validation');
    return [validate('bot'), validate('broadcaster')];
  }

  @onStreamStart()
  reconnectOnStreamStart() {
    if (this.enabled) {
      this.tmi?.part('bot').then(() => this.tmi?.join('bot', this.currentChannel));
      this.tmi?.part('broadcaster').then(() => this.tmi?.join('broadcaster', this.currentChannel));
    }
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

  @parser({ priority: constants.LOW, fireAndForget: true })
  async containsEmotes (opts: ParserOptions) {
    return this.emotes?.containsEmotes(opts);
  }

  sockets() {
    adminEndpoint(this.nsp, 'broadcaster', (cb) => {
      try {
        cb(null, (this.broadcasterUsername).toLowerCase());
      } catch (e: any) {
        cb(e.stack, '');
      }
    });
    publicEndpoint(this.nsp, 'getCache', async (cb) => {
      try {
        cb(null, await getRepository(CacheEmotes).find());
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'testExplosion', (cb) => {
      this.emotes?._testExplosion();
      cb(null, null);
    });
    adminEndpoint(this.nsp, 'testFireworks', (cb) => {
      this.emotes?._testFireworks();
      cb(null, null);
    });
    adminEndpoint(this.nsp, 'test', (cb) => {
      this.emotes?._test();
      cb(null, null);
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
      .where('user.userName != :botusername', { botusername: this.botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: this.broadcasterUsername.toLowerCase() })
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
      .where('user.userName != :botusername', { botusername: this.botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: this.broadcasterUsername.toLowerCase() })
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
