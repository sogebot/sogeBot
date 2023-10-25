import { EventList } from '@entity/eventList.js';
import { User } from '@entity/user.js';
import { SECOND } from '@sogebot/ui-helpers/constants.js';
import { dayjs, timezone } from '@sogebot/ui-helpers/dayjsHelper.js';
import { getTime } from '@sogebot/ui-helpers/getTime.js';
import { ApiClient } from '@twurple/api';
import { capitalize } from 'lodash-es';

import Service from './_interface.js';
import { init } from './twitch/api/interval.js';
import { createClip } from './twitch/calls/createClip.js';
import { createMarker } from './twitch/calls/createMarker.js';
import { updateBroadcasterType } from './twitch/calls/updateBroadcasterType.js';
import Chat from './twitch/chat.js';
import EventSubLongPolling from './twitch/eventSubLongPolling.js';
import EventSubWebsocket from './twitch/eventSubWebsocket.js';
import { CustomAuthProvider } from './twitch/token/CustomAuthProvider.js';
import { onChange, onLoad, onStreamStart } from '../decorators/on.js';
import {
  command, default_permission, example, persistent, settings,
} from '../decorators.js';
import { Expects } from  '../expects.js';
import { debug, error, info } from '../helpers/log.js';

import { AppDataSource } from '~/database.js';
import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { prepare } from '~/helpers/commons/prepare.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { adminEndpoint } from '~/helpers/socket.js';
import {
  ignorelist, sendWithMe, setMuteStatus, showWithAt,
} from '~/helpers/tmi/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import getNameById from '~/helpers/user/getNameById.js';
import { isIgnored } from '~/helpers/user/isIgnored.js';
import { sendGameFromTwitch } from '~/services/twitch/calls/sendGameFromTwitch.js';
import { updateChannelInfo } from '~/services/twitch/calls/updateChannelInfo.js';
import { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

const urls = {
  'SogeBot Token Generator v2': 'https://credentials.sogebot.xyz/twitch/refresh/',
};
const markerEvents = new Set<string>();
const loadedKeys = new Set<string>();

class Twitch extends Service {
  tmi: Chat | null = null;
  eventSubLongPolling: EventSubLongPolling | null = null;
  eventSubWebsocket: EventSubWebsocket | null = null;

  authProvider: CustomAuthProvider | null = null;
  apiClient: ApiClient | null = null;

  @persistent()
    uptime = 0;

  @persistent() // needs to be persistent as we are using it with variables.get
    botTokenValid = false;
  @persistent() // needs to be persistent as we are using it with variables.get
    broadcasterTokenValid = false;

  @settings('chat')
    sendWithMe = false;
  @settings('chat')
    sendAsReply = false;
  @settings('chat')
    ignorelist: any[] = [];
  @settings('chat')
    showWithAt = true;
  @settings('chat')
    mute = false;
  @settings('chat')
    whisperListener = false;

  @settings('general')
    tokenService: keyof typeof urls | 'Own Twitch App' = 'SogeBot Token Generator v2';
  @settings('general')
    tokenServiceCustomClientId = '';
  @settings('general')
    tokenServiceCustomClientSecret = '';
  @settings('general')
    generalOwners: string[] = [];
  @settings('general')
    createMarkerOnEvent = true;

  @settings('broadcaster')
    broadcasterRefreshToken = '';
  @settings('broadcaster')
    broadcasterId = '';
  @settings('broadcaster')
    broadcasterUsername = '';
  @settings('broadcaster')
    broadcasterCurrentScopes: string[] = [];
  @persistent()
    broadcasterType: string | null = null;

  @settings('bot')
    botRefreshToken = '';
  @settings('bot')
    botId = '';
  @settings('bot')
    botUsername = '';
  @settings('bot')
    botCurrentScopes: string[] = [];

  @onChange('botCurrentScopes')
  onChangeBotScopes() {
    if (this.botCurrentScopes.length > 0) {
      info('TWITCH: Bot scopes ' + this.botCurrentScopes.join(', '));
    }
  }

  @onChange('broadcasterCurrentScopes')
  onChangeBroadcasterScopes() {
    if (this.broadcasterCurrentScopes.length > 0) {
      info('TWITCH: Broadcaster scopes ' + this.broadcasterCurrentScopes.join(', '));
    }
  }

  @onLoad(['tokenService', 'tokenServiceCustomClientId', 'tokenServiceCustomClientSecret'])
  @onChange(['tokenService', 'tokenServiceCustomClientId', 'tokenServiceCustomClientSecret'])
  onTokenServiceChange() {
    let clientId;
    switch (this.tokenService) {
      case 'SogeBot Token Generator v2':
        clientId = '89k6demxtifvq0vzgjpvr1mykxaqmf';
        break;
      default:
        clientId = this.tokenServiceCustomClientId;
    }
    this.authProvider = new CustomAuthProvider({
      clientId,
      clientSecret: this.tokenServiceCustomClientSecret, // we don't care if we have generator
    });
    this.apiClient = new ApiClient({ authProvider: this.authProvider });
  }

  @onLoad(['broadcasterRefreshToken', 'botRefreshToken', 'tokenService', 'tokenServiceCustomClientId', 'tokenServiceCustomClientSecret'])
  async onChangeRefreshTokens(key: string) {
    this.botTokenValid = false;
    this.broadcasterTokenValid = false;

    loadedKeys.add(key);
    if (loadedKeys.size < 5 || !this.authProvider || !this.apiClient) {
      debug('twitch.onChangeRefreshTokens', 'Not yet loaded');
      return;
    }
    debug('twitch.onChangeRefreshTokens', 'Adding tokens to authProvider');
    if (this.botRefreshToken.length > 0) {
      const userId = await this.authProvider.addUserForToken({
        expiresIn:           0,
        refreshToken:        this.botRefreshToken,
        obtainmentTimestamp: 0,
      });
      this.authProvider.addIntentsToUser(userId, ['bot', 'chat']);
      const tokenInfo = await this.apiClient.asUser(userId, ctx => ctx.getTokenInfo());
      this.botId = userId;
      this.botUsername = tokenInfo.userName ?? '';
      this.botCurrentScopes = tokenInfo.scopes;
      this.botTokenValid = true;
      info(`TWITCH: Bot token initialized OK for ${this.botUsername}#${this.botId} with scopes: ${this.botCurrentScopes.join(', ')}`);
    }
    if (this.broadcasterRefreshToken.length > 0) {
      const userId = await this.authProvider.addUserForToken({
        expiresIn:           0,
        refreshToken:        this.broadcasterRefreshToken,
        obtainmentTimestamp: 0,
      });

      this.authProvider.addIntentsToUser(userId, ['broadcaster']);
      const tokenInfo = await this.apiClient.asUser(userId, ctx => ctx.getTokenInfo());
      this.broadcasterId = userId;
      this.broadcasterUsername = tokenInfo.userName ?? '';
      this.broadcasterCurrentScopes = tokenInfo.scopes;
      this.broadcasterTokenValid = true;
      setTimeout(() => updateBroadcasterType(), 5000);
      info(`TWITCH: Broadcaster token initialized OK for ${this.broadcasterUsername}#${this.broadcasterId} (type: ${this.broadcasterType}) with scopes: ${this.broadcasterCurrentScopes.join(', ')}`);
    }
    this.onTokenValidChange();
  }

  onTokenValidChange() {
    debug('twitch.onTokenValidChange', 'onTokenValidChange()');

    if (!this.broadcasterTokenValid) {
      debug('twitch.eventsub', 'onTokenValidChange() listener stop()');
    }
    if (this.broadcasterTokenValid && this.botTokenValid) {
      setTimeout(() => {
        if (!this.authProvider || !this.apiClient) {
          return;
        }
        this.tmi = new Chat(this.authProvider);
        this.eventSubLongPolling = new EventSubLongPolling();
        this.eventSubWebsocket = new EventSubWebsocket(this.apiClient);

        if (this.broadcasterId === this.botId) {
          error(`You have set bot and broadcaster oauth for same user ${this.broadcasterUsername}#${this.broadcasterId}. This is *NOT RECOMMENDED*. Please use *SEPARATE* account for bot.`);
        }
      }, 2000);
    } else {
      this.tmi = null;
      this.eventSubLongPolling = null;
      this.eventSubWebsocket = null;
    }
  }

  constructor() {
    super();

    this.botTokenValid = false;
    this.broadcasterTokenValid = false;

    setTimeout(() => {
      init(); // start up intervals for api
    }, 30000);

    setInterval(() => {
      if (markerEvents.size > 0) {
        const description: string[] = [];
        const events = Array.from(markerEvents.values());

        // group events if there are more then five in second
        if (events.length > 5) {
          // we need to group everything, as description can be max of 140 chars
          for (const event of ['follow', 'subs/resubs/gifts', 'tip', 'rewardredeem', 'raids', 'cheer']) {
            const length = events.filter(o => {
              if (event === 'subs/resubs/gifts') {
                return o.startsWith('subgift') || o.startsWith('resub') || o.startsWith('sub') || o.startsWith('subcommunitygift');
              }
              if (event === 'raids') {
                return o.startsWith('raid');
              }
              return o.startsWith(event);
            }).length;
            if (length > 0) {
              description.push(`${event}: ${length}`);
            }
          }
          if (isStreamOnline.value) {
            createMarker(description.join(', '));
          }
        } else {
          if (isStreamOnline.value) {
            for (const event of events) {
              createMarker(event);
            }
          }
        }
        markerEvents.clear();
      }

      if (isStreamOnline.value) {
        this.uptime += SECOND;
      }
    }, SECOND);
  }

  addEventToMarker(event: EventList.Event['event'], username: string) {
    if (this.createMarkerOnEvent) {
      markerEvents.add(`${event} ${username}`);
    }
  }

  @onChange('broadcasterUsername')
  public async onChangeBroadcasterUsername(key: string, value: any) {
    if (!this.generalOwners.includes(value)) {
      this.generalOwners.push(value);
    }
  }

  @onStreamStart()
  async reconnectOnStreamStart() {
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    this.uptime = 0;
    await this.tmi?.part('bot');
    await this.tmi?.join('bot', broadcasterUsername);
    await this.tmi?.part('broadcaster');
    await this.tmi?.join('broadcaster', broadcasterUsername);
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

  @onChange('mute')
  @onLoad('mute')
  setMuteStatus() {
    setMuteStatus(this.mute);
  }

  sockets() {
    adminEndpoint('/services/twitch', 'broadcaster', (cb) => {
      try {
        cb(null, (this.broadcasterUsername).toLowerCase());
      } catch (e: any) {
        cb(e.stack, '');
      }
    });
    adminEndpoint('/services/twitch', 'twitch::revoke', async ({ accountType }, cb) => {
      if (accountType === 'bot') {
        this.botRefreshToken = '';
        this.botCurrentScopes = [];
        this.botId = '';
        this.botTokenValid = false;
        this.botUsername = '';
      } else {
        this.broadcasterRefreshToken = '';
        this.broadcasterCurrentScopes = [];
        this.broadcasterId = '';
        this.broadcasterTokenValid = false;
        this.broadcasterUsername = '';
      }
      info(`TWITCH: ${capitalize(accountType)} access revoked.`);
      cb(null);
    });
    adminEndpoint('/services/twitch', 'twitch::token', async ({ accessToken, refreshToken, accountType }, cb) => {
      this.tokenService = 'SogeBot Token Generator v2';
      this[`${accountType}RefreshToken`] = refreshToken;
      // waiting a while for variable propagation
      setTimeout(() => {
        this.onChangeRefreshTokens(`${accountType}RefreshToken`);
        setTimeout(async () => {
          cb(null);
        }, 1000);
      }, 250);
    });
    adminEndpoint('/services/twitch', 'twitch::token::ownApp', async ({ accessToken, refreshToken, accountType, clientId, clientSecret }, cb) => {
      this.tokenService ='Own Twitch App';
      this[`${accountType}RefreshToken`] = refreshToken;
      this.tokenServiceCustomClientId = clientId;
      this.tokenServiceCustomClientSecret = clientSecret;
      // waiting a while for variable propagation
      setTimeout(() => {
        this.onChangeRefreshTokens(`${accountType}RefreshToken`);
        setTimeout(async () => {
          cb(null);
        }, 1000);
      }, 250);
    });
  }

  @command('!clip')
  @default_permission(defaultPermissions.CASTERS)
  async clip (opts: CommandOptions) {
    const cid = await createClip({ createAfterDelay: false });
    if (cid) {
      return [{
        response: prepare('api.clips.created', { link: `https://clips.twitch.tv/${cid}` }),
        ...opts,
      }];
    } else {
      return [{
        response: await translate(isStreamOnline.value ? 'clip.notCreated' : 'clip.offline'),
        ...opts,
      }];
    }
  }

  @command('!replay')
  @default_permission(defaultPermissions.CASTERS)
  async replay (opts: CommandOptions) {
    const cid = await createClip({ createAfterDelay: false });
    if (cid) {
      (await import('~/overlays/clips.js')).default.showClip(cid);
      return [{
        response: prepare('api.clips.created', { link: `https://clips.twitch.tv/${cid}` }),
        ...opts,
      }];
    } else {
      return [{
        response: await translate(isStreamOnline.value ? 'clip.notCreated' : 'clip.offline'),
        ...opts,
      }];
    }
  }

  @command('!uptime')
  async uptimeCmd (opts: CommandOptions) {
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
    const events = await AppDataSource.getRepository(EventList)
      .createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event = :event', { event: 'follow' })
      .getMany();

    let lastFollowAgo = '';
    let lastFollowUsername = 'n/a';
    if (events.length > 0) {
      lastFollowUsername = await getNameById(events[0].userId);
      lastFollowAgo = dayjs(events[0].timestamp).fromNow();
    }

    const response = prepare('followers', {
      lastFollowAgo:      lastFollowAgo,
      lastFollowUsername: lastFollowUsername,
    });
    return [ { response, ...opts }];
  }

  @command('!subs')
  async subs (opts: CommandOptions) {
    const events = await AppDataSource.getRepository(EventList)
      .createQueryBuilder('events')
      .select('events')
      .orderBy('events.timestamp', 'DESC')
      .where('events.event = :event', { event: 'sub' })
      .orWhere('events.event = :event2', { event2: 'resub' })
      .orWhere('events.event = :event3', { event3: 'subgift' })
      .getMany();
    await changelog.flush();
    const onlineSubscribers = (await AppDataSource.getRepository(User).createQueryBuilder('user')
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
      lastSubUsername = await getNameById(events[0].userId);
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
    const status = await updateChannelInfo({ title: opts.parameters });
    return status ? [ { response: status.response, ...opts } ] : [];
  }

  @command('!game')
  async getGame (opts: CommandOptions) {
    return [ { response: translate('game.current').replace(/\$title/g, stats.value.currentGame || 'n/a'), ...opts }];
  }

  @command('!marker')
  @example([
    [
      '?!marker <optionalDescription>',
    ],
    [
      '+!marker Something amazing just happened!',
      { message: '-Stream marker has been created at 00:10:05.', replace: {} },
    ],
    [
      '+!marker',
      { message: '-Stream marker has been created at 00:10:06.', replace: {} },
    ],
  ])
  @default_permission(defaultPermissions.MODERATORS)
  async createMarker (opts: CommandOptions) {
    const description = opts.parameters.trim().length === 0
      ? 'Created by ' + opts.sender.userName
      : opts.parameters + ' by ' + opts.sender.userName;
    const marker = await createMarker(description);
    if (marker) {
      return [{ response: translate('marker').replace(/\$time/g, getTime(marker.positionInSeconds, false) || '???'), ...opts }];
    } else {
      return [];
    }
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
      const status = await updateChannelInfo({ game: games[exactMatchIdx !== -1 ? exactMatchIdx : 0] });
      return status ? [ { response: status.response, ...opts } ] : [];
    }
    return [{ response: translate('game.current').replace(/\$title/g, stats.value.currentGame || 'n/a'), ...opts }];
  }

  @default_permission(defaultPermissions.CASTERS)
  @command('!reconnect')
  async reconnect() {
    if (this.tmi) {
      info('TMI: Triggering reconnect from chat');
      this.tmi.shouldConnect = true;
      this.tmi.reconnect('bot');
      this.tmi.reconnect('broadcaster');
    } else {
      error('TMI: Not initialized');
    }
    return [];
  }

}

export default new Twitch();
