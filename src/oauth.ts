import * as constants from '@sogebot/ui-helpers/constants';
import axios from 'axios';

import Core from './_interface';
import { areDecoratorsLoaded, settings } from './decorators';
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
import { addUIError } from './helpers/panel/';
import { setStatus } from './helpers/parser';
import { cleanViewersCache } from './helpers/permissions';
import { tmiEmitter } from './helpers/tmi';
import { getIdFromTwitch } from './microservices/getIdFromTwitch';
import { getUserFromTwitch } from './microservices/getUserFromTwitch';

let botTokenErrorSent = false;
let broadcasterTokenErrorSent = false;

let lastBotTokenValidation = 0;
let lastBroadcasterTokenValidation = 0;

const urls = {
  'Twitch Token Generator':  'https://twitchtokengenerator.com/api/refresh/',
  'SogeBot Token Generator': 'https://twitch-token-generator.soge.workers.dev/refresh/',
};

class OAuth extends Core {
  private toWait = 10;

  public cache: { bot: string; broadcaster: string } = { bot: '', broadcaster: '' };
  public currentChannel = '';
  public broadcasterType: string | null = null;
  public profileImageUrl = '';
  public broadcaster = '';
  public bot = '';
  @settings('bot')
  public botClientId = '';
  @settings('broadcaster')
  public broadcasterClientId = '';

  @settings('general')
  public tokenService: keyof typeof urls = 'Twitch Token Generator';
  @settings('general')
  public tokenServiceCustomClientId = '';
  @settings('general')
  public tokenServiceCustomClientSecret = '';

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
    'channel:read:hype_train',
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
    this.validateTokens();
    this.getChannelId();
  }

  validateTokens() {
    return [this.validateOAuth('bot'), this.validateOAuth('broadcaster')];
  }

  @onLoad('broadcasterAccessToken')
  @onLoad('botAccessToken')
  setBotAccessTokenLoaded() {
    loadedTokens.value++;
  }

  @onChange('generalOwners')
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
      } catch (e: any) {
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
        lastBroadcasterTokenValidation = 0;
        this.validateOAuth('broadcaster');
        if (value === '') {
          this.cache.broadcaster = 'force_reconnect';
          this.broadcasterUsername = '';
          tmiEmitter.emit('part', 'broadcaster');
        }
        break;
      case 'botAccessToken':
        lastBotTokenValidation = 0;
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
    if (type === 'bot' && Date.now() - lastBotTokenValidation < constants.MINUTE) {
      return true;
    }
    if (type === 'broadcaster' && Date.now() - lastBroadcasterTokenValidation < constants.MINUTE) {
      return true;
    }

    if (type === 'bot') {
      lastBotTokenValidation = Date.now();
    }

    if (type === 'broadcaster') {
      lastBroadcasterTokenValidation = Date.now();
    }

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

        if (request.data.expires_in < 300) {
          await this.refreshAccessToken(type);
          return true;
        }
      } catch (e: any) {
        if (e.isAxiosError) {
          if ((typeof e.response === 'undefined' || (e.response.status !== 401 && e.response.status !== 403)) && retry < 5) {
            // retry validation if error is different than 401 Invalid Access Token
            await new Promise<void>((resolve) => {
              setTimeout(() => resolve(), 1000 + (retry ** 2));
            });
            return this.validateOAuth(type, retry++);
          }
          if (e.response.status === 401) {
            await this.refreshAccessToken(type);
            return true;
          }
          throw new Error(`Error on validate ${type} OAuth token, error: ${e.response.status} - ${e.response.statusText} - ${e.response.data.message}`);
        } else {
          debug('oauth.validate', e.stack);
          throw new Error(e);
        }
      }

      if (type === 'bot') {
        botId.value = request.data.user_id;
      } else {
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
    } catch (e: any) {
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
    const url = urls[this.tokenService];
    try {
      if ((type === 'bot' ? this.botRefreshToken : this.broadcasterRefreshToken) === '') {
        throw new Error('no refresh token for ' + type);
      }

      if (!url) {
        // custom app is selected
        const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${this.tokenServiceCustomClientId}&client_secret=${this.tokenServiceCustomClientSecret}&refresh_token=${type === 'bot' ? this.botRefreshToken : this.broadcasterRefreshToken}&grant_type=refresh_token`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();

          if (type === 'bot') {
            this.botAccessToken = data.access_token;
            this.botRefreshToken = data.refresh_token;
          } else {
            this.broadcasterAccessToken = data.access_token;
            this.broadcasterRefreshToken = data.refresh_token;
          }

          warning('Access token of ' + type + ' was refreshed.');
          warning('New access token of ' + type + ': ' + data.access_token.replace(/(.{25})/, '*'.repeat(25)));
          warning('New refresh token of ' + type + ': ' + data.refresh_token.replace(/(.{45})/, '*'.repeat(45)));

          return data.access_token;
        } else {
          throw new Error('Custom token refresh failed');
        }
      } else {
        const request = await axios.post(url + encodeURIComponent(type === 'bot' ? this.botRefreshToken : this.broadcasterRefreshToken));
        debug('oauth.validate', urls[this.tokenService] + ' =>');
        debug('oauth.validate', JSON.stringify(request.data, null, 2));
        if (!request.data.success) {
          if (request.data.message.includes('Invalid refresh token received')) {
            warning(`Invalid refresh token for ${type}. Please reset your token.`);
            addUIError({ name: 'Token Error!', message: `Invalid refresh token for ${type}. Please reset your token.` });
            if (type === 'broadcaster') {
              this.broadcasterAccessToken = '';
              this.broadcasterRefreshToken = '';
            } else {
              this.botRefreshToken = '';
              this.botAccessToken = '';
            }
          }
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

        return request.data.token;
      }
    } catch (e: any) {
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
