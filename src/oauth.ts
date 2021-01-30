import * as constants from '@sogebot/ui-helpers/constants';
import axios from 'axios';

import Core from './_interface';
import {
  areDecoratorsLoaded, persistent, settings,
} from './decorators';
import {
  onChange, onLoad, onStartup,
} from './decorators/on';
import { apiEmitter } from './helpers/api/emitter';
import {
  debug,
  error, info, warning,
} from './helpers/log';
import { channelId, loadedTokens } from './helpers/oauth';
import { botId } from './helpers/oauth/botId';
import { botProfileUrl } from './helpers/oauth/botProfileUrl';
import { botUsername } from './helpers/oauth/botUsername';
import { broadcasterId } from './helpers/oauth/broadcasterId';
import { broadcasterUsername } from './helpers/oauth/broadcasterUsername';
import { generalChannel } from './helpers/oauth/generalChannel';
import { generalOwners } from './helpers/oauth/generalOwners';
import { setOAuthStatus } from './helpers/OAuthStatus';
import { setStatus } from './helpers/parser';
import { cleanViewersCache } from './helpers/permissions';
import { tmiEmitter } from './helpers/tmi';
import { getIdFromTwitch } from './microservices/getIdFromTwitch';
import { getUserFromTwitch } from './microservices/getUserFromTwitch';

let botTokenErrorSent = false;
let broadcasterTokenErrorSent = false;

class OAuth extends Core {
  private toWait = 10;

  public cache: { bot: string; broadcaster: string } = { bot: '', broadcaster: '' };
  public currentChannel = '';
  public broadcasterType: string | null = null;
  public profileImageUrl = '';
  public broadcaster = '';
  public bot = '';
  @persistent()
  public botClientId = '';
  @persistent()
  public broadcasterClientId = '';

  @settings('general')
  public generalChannel = '';

  @settings('general')
  public generalOwners: string[] = [];

  @settings('broadcaster')
  public broadcasterAccessToken = '';

  @settings('broadcaster')
  public broadcasterRefreshToken = '';

  @settings('broadcaster')
  public broadcasterUsername = '';

  @settings('broadcaster', true)
  public broadcasterExpectedScopes: string[] = [
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
  ];

  @settings('broadcaster')
  public broadcasterCurrentScopes: string[] = [];

  @settings('bot')
  public botAccessToken = '';

  @settings('bot')
  public botRefreshToken = '';

  @settings('bot')
  public botUsername = '';

  @settings('bot', true)
  public botExpectedScopes: string[] = [
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
  public botCurrentScopes: string[] = [];

  @onStartup()
  onStartup() {
    this.validateOAuth('bot');
    this.validateOAuth('broadcaster');
    this.getChannelId();
  }

  @onLoad('broadcasterAccessToken')
  @onLoad('botAccessToken')
  setBotAccessTokenLoaded() {
    loadedTokens.value++;
  }

  @onChange('generalOwner')
  @onChange('broadcasterUsername')
  clearCache() {
    cleanViewersCache();
  }

  public async getChannelId() {
    if ((global as any).mocha) {
      return;
    }
    if (!areDecoratorsLoaded) {
      setTimeout(() => this.getChannelId(), 1000);
      return;
    }
    clearTimeout(this.timeouts.getChannelId);

    let timeout = 1000;

    if (this.currentChannel !== this.generalChannel && this.generalChannel !== '') {
      try {
        const cid = await getIdFromTwitch(this.generalChannel, true);
        if (typeof cid !== 'undefined' && cid !== null) {
          this.currentChannel = this.generalChannel;
          channelId.value = cid;
          info('Channel ID set to ' + cid);
          tmiEmitter.emit('reconnect', 'bot');
          tmiEmitter.emit('reconnect', 'broadcaster');
          apiEmitter.emit('updateChannelViewsAndBroadcasterType');
          this.toWait = 10;
        } else {
          throw new Error();
        }
      } catch (e) {
        error(e.stack);
        error(`Cannot get channel ID of ${this.generalChannel} - waiting ${this.toWait.toFixed()}s`);
        timeout = this.toWait * 1000;
        this.toWait = this.toWait * 2;
      }
    }

    this.timeouts.getChannelId = global.setTimeout(() => this.getChannelId(), timeout);
  }

  @onChange('broadcasterUsername')
  @onChange('botUsername')
  setOAuthStatus() {
    setOAuthStatus('bot', this.botUsername === '');
    setOAuthStatus('broadcaster', this.broadcasterUsername === '');
  }

  @onChange('generalChannel')
  @onLoad('generalChannel')
  setGeneralChannel() {
    generalChannel.value = this.generalChannel;
  }

  @onChange('generalOwners')
  @onLoad('generalOwners')
  setGeneralOwners() {
    generalOwners.value = this.generalOwners;
  }

  @onChange('botUsername')
  @onLoad('botUsername')
  setBotUsername() {
    botUsername.value = this.botUsername;
  }

  @onChange('broadcasterUsername')
  @onLoad('broadcasterUsername')
  setBroadcasterUsername() {
    broadcasterUsername.value = this.broadcasterUsername;
  }

  @onChange('broadcasterUsername')
  public async onChangeBroadcasterUsername(key: string, value: any) {
    if (!this.generalOwners.includes(value)) {
      this.generalOwners.push(value);
    }
  }

  @onChange('botAccessToken')
  @onChange('broadcasterAccessToken')
  public async onChangeAccessToken(key: string, value: any) {
    switch (key) {
      case 'broadcasterAccessToken':
        this.validateOAuth('broadcaster');
        if (value === '') {
          this.cache.broadcaster = 'force_reconnect';
          this.broadcasterUsername = '';
          tmiEmitter.emit('part', 'broadcaster');
        }
        break;
      case 'botAccessToken':
        this.validateOAuth('bot');
        if (value === '') {
          this.cache.bot = 'force_reconnect';
          this.botUsername = '';
          tmiEmitter.emit('part', 'bot');
        }
        break;
    }
  }

  /*
   * Validates OAuth access tokens
   * and sets this[type + 'Username']
   * and sets this[type + 'CurrentScopes']
   * if invalid refreshAccessToken()
   * @param {string} type - bot or broadcaster
   *
   * Example output:
      {
        "client_id": "<your client ID>",
        "login": "<authorized user login>",
        "scopes": [
          "<requested scopes>"
        ],
        "user_id": "<authorized user ID>"
      }
    */
  public async validateOAuth(type: 'bot' | 'broadcaster', retry = 0): Promise<boolean> {
    if ((global as any).mocha) {
      return true;
    }

    const url = 'https://id.twitch.tv/oauth2/validate';
    let status = true;
    try {
      if ((type === 'bot' ? this.botAccessToken : this.broadcasterAccessToken) === '') {
        throw new Error('no access token for ' + type);
      } else if (!['bot', 'broadcaster'].includes(type)) {
        throw new Error(`Type ${type} is not supported`);
      }

      let request;
      try {
        debug('oauth.validate', `Checking ${type} - retry no. ${retry}`);
        request = await axios.get(url, { headers: { Authorization: 'OAuth ' + (type === 'bot' ? this.botAccessToken : this.broadcasterAccessToken) } });
        debug('oauth.validate', JSON.stringify(request.data));
      } catch (e) {
        if (e.isAxiosError) {
          if ((typeof e.response === 'undefined' || (e.response.status !== 401 && e.response.status !== 403)) && retry < 5) {
            // retry validation if error is different than 401 Invalid Access Token
            await new Promise<void>((resolve) => {
              setTimeout(() => resolve(), 1000 + (retry ** 2));
            });
            return this.validateOAuth(type, retry++);
          }
          throw new Error(`Error on validate ${type} OAuth token, error: ${e.response.status} - ${e.response.statusText} - ${e.response.data.message}`);
        } else {
          debug('oauth.validate', e.stack);
          throw new Error(e);
        }
      }

      if (type === 'bot') {
        this.botClientId = request.data.client_id;
        botId.value = request.data.user_id;
      } else {
        this.broadcasterClientId = request.data.client_id;
        broadcasterId.value = request.data.user_id;
      }

      if (type === 'bot' && botId.value === broadcasterId.value) {
        warning('You shouldn\'t use same account for bot and broadcaster!');
      }

      if (type === 'bot') {
        this.botUsername = request.data.login;
        this.botCurrentScopes = request.data.scopes;
        botTokenErrorSent = false;

        // load profile image of a bot
        const userFromTwitch = await getUserFromTwitch(request.data.login);
        botProfileUrl.value = userFromTwitch.profile_image_url;
      } else {
        this.broadcasterUsername = request.data.login;
        this.broadcasterCurrentScopes = request.data.scopes;
        broadcasterTokenErrorSent = false;
      }

      const cache = this.cache[type];
      if (cache !== '' && cache !== request.data.login + request.data.scopes.join(',')) {
        tmiEmitter.emit('reconnect', type); // force TMI reconnect
        this.cache[type] = request.data.login + request.data.scopes.join(',');
      }

      setStatus('API', request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED);

      this.toWait = 10;
      this.getChannelId();
    } catch (e) {
      if (e.message.includes('no access token for')) {
        if ((type === 'bot' && !botTokenErrorSent) || (type === 'broadcaster' && !broadcasterTokenErrorSent)) {
          warning(`Access token ${type} account not found. Please set it in UI.`);
          if (type === 'broadcaster') {
            broadcasterTokenErrorSent = true;
          } else {
            botTokenErrorSent = true;
          }
        }
      } else {
        error(e);
        error(e.stack);
      }
      status = false;
      if ((type === 'bot' ? this.botRefreshToken : this.broadcasterRefreshToken) !== '') {
        this.refreshAccessToken(type);
      } else {
        if (type === 'bot') {
          botId.value = '';
          this.botUsername = '';
          this.botCurrentScopes = [];
        } else {
          broadcasterId.value = '';
          this.broadcasterUsername = '';
          this.broadcasterCurrentScopes = [];
        }
      }
    }
    return status;
  }

  /*
   * Refresh OAuth access tokens - we are using twitchtokengenerator for this
   * @param {string} type - bot or broadcaster
   *
   * Example output:
      {
        "access_token": "asdfasdf",
        "refresh_token": "eyJfMzUtNDU0OC04MWYwLTQ5MDY5ODY4NGNlMSJ9%asdfasdf=",
        "scope": "viewing_activity_read"
      }
    */
  public async refreshAccessToken(type: 'bot' | 'broadcaster') {
    warning('Refreshing access token of ' + type);
    const url = 'https://twitchtokengenerator.com/api/refresh/';
    try {
      if ((type === 'bot' ? this.botRefreshToken : this.broadcasterRefreshToken) === '') {
        throw new Error('no refresh token for ' + type);
      }

      const request = await axios.post(url + encodeURIComponent(type === 'bot' ? this.botRefreshToken : this.broadcasterRefreshToken));
      debug('oauth.validate', 'https://twitchtokengenerator.com/api/refresh/ =>');
      debug('oauth.validate', JSON.stringify(request.data, null, 2));
      if (!request.data.success) {
        throw new Error(`Token refresh for ${type}: ${request.data.message}`);
      }
      if (typeof request.data.token !== 'string' || request.data.token.length === 0) {
        throw new Error(`Access token for ${type} was not correctly fetched (not a string)`);
      }
      if (typeof request.data.refresh !== 'string' || request.data.refresh.length === 0) {
        throw new Error(`Refresh token for ${type} was not correctly fetched (not a string)`);
      }
      if (type === 'bot') {
        this.botAccessToken = request.data.token;
        this.botRefreshToken = request.data.refresh;
      } else {
        this.broadcasterAccessToken = request.data.token;
        this.broadcasterRefreshToken = request.data.refresh;
      }

      warning('Access token of ' + type + ' was refreshed.');
      warning('New access token of ' + type + ': ' + request.data.token.replace(/(.{25})/, '*'.repeat(25)));
      warning('New refresh token of ' + type + ': ' + request.data.refresh.replace(/(.{45})/, '*'.repeat(45)));
      this.validateOAuth(type);

      return request.data.token;
    } catch (e) {
      error(e.stack);
      if (type === 'bot') {
        botId.value = '';
        this.botUsername = '';
        this.botCurrentScopes = [];
      } else {
        broadcasterId.value = '';
        this.broadcasterUsername = '';
        this.broadcasterCurrentScopes = [];
      }

      error('Access token of ' + type + ' was not refreshed.');
      error(e.stack);
    }
  }
}

export default new OAuth();
