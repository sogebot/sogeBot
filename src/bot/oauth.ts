import axios from 'axios';
import { isMainThread } from './cluster';

import Core from './_interface';
import * as constants from './constants';
import { areDecoratorsLoaded, settings, shared, ui } from './decorators';
import { onChange } from './decorators/on';
import { error, info, warning } from './helpers/log';
import api from './api';
import tmi from './tmi';
import { setStatus } from './helpers/parser';

class OAuth extends Core {
  private toWait = 10;

  @shared()
  public cache: { bot: string; broadcaster: string } = { bot: '', broadcaster: '' };
  @shared()
  public currentChannel = '';
  @shared()
  public broadcasterType: string | null = null;
  @shared()
  public broadcaster = '';
  @shared()
  public bot = '';
  @shared()
  public clientId = '';
  @shared()
  public channelId = '';
  @shared()
  public botId = '';
  @shared()
  public broadcasterId = '';

  @settings('general')
  public generalChannel = '';

  @settings('general')
  public generalOwners: string[] = [];

  @settings('general')
  @ui({ type: 'selector', values: ['simple', 'advanced'] })
  settingsType = 'simple';

  @settings('general')
  @ui({
    type: 'text-input',
    secret: true,
    showIf: {
      settingsType: 'advanced',
    },
  })
  manualClientId = '';

  @settings('general')
  @ui({
    type: 'text-input',
    secret: true,
    showIf: {
      settingsType: 'advanced',
    },
  })
  manualClientSecret = '';

  @settings('broadcaster')
  @ui({ type: 'text-input', secret: true, showIf: { settingsType: 'simple' } })
  public broadcasterAccessToken = '';

  @settings('broadcaster')
  @ui({ type: 'text-input', secret: true, showIf: { settingsType: 'simple' } })
  public broadcasterRefreshToken = '';

  @settings('broadcaster')
  @ui({ readOnly: true, type: 'text-input' })
  public broadcasterUsername = '';

  @settings('broadcaster', true)
  @ui({ type: 'checklist', current: 'broadcasterCurrentScopes' })
  public broadcasterExpectedScopes: string[] = [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'channel:read:subscriptions',
  ];

  @settings('broadcaster')
  @ui({ ignore: true })
  public broadcasterCurrentScopes: string[] = [];

  @ui({
    type: 'link',
    href: 'https://twitchtokengenerator.com/quick/RkshHUnw16',
    class: 'btn btn-primary btn-block',
    text: 'commons.generate',
    target: '_blank',
    showIf: { settingsType: 'simple' },
  }, 'broadcaster')
  public broadcasterGenerateLink = null;

  @ui({
    type: 'link',
    href: '',
    class: 'btn btn-primary btn-block',
    text: 'commons.authorize',
    target: '_blank',
    showIf: { settingsType: 'advanced', broadcasterUsername: '' },
  }, 'broadcaster')
  public broadcasterAuthorizeLink = null;

  @ui({
    type: 'link',
    href: '',
    class: 'btn btn-danger btn-block',
    text: 'commons.deauthorize',
    target: '_blank',
    showIf: { settingsType: 'advanced', broadcasterUsername: 'lengthAtLeast(1)' },
  }, 'broadcaster')
  public broadcasterDeAuthorizeLink = null;


  @settings('bot')
  @ui({ type: 'text-input', secret: true, showIf: { settingsType: 'simple' } })
  public botAccessToken = '';

  @settings('bot')
  @ui({ type: 'text-input', secret: true, showIf: { settingsType: 'simple' } })
  public botRefreshToken = '';

  @settings('bot')
  @ui({ readOnly: true, type: 'text-input' })
  public botUsername = '';

  @settings('bot', true)
  @ui({ type: 'checklist', current: 'botCurrentScopes' })
  public botExpectedScopes: string[] = [
    'channel:moderate',
    'chat:edit',
    'chat:read',
    'whispers:read',
    'whispers:edit',
    'channel_editor',
    'channel_commercial',
    'clips:edit',
    'user:edit:broadcast',
    'user:read:broadcast',
  ];

  @settings('bot')
  @ui({ ignore: true })
  public botCurrentScopes: string[] = [];

  @ui({
    type: 'link',
    href: 'https://twitchtokengenerator.com/quick/UQ6SHl81nt',
    class: 'btn btn-primary btn-block',
    text: 'commons.generate',
    target: '_blank',
    showIf: { settingsType: 'simple' },
  }, 'bot')
  public botGenerateLink = null;

  @ui({
    type: 'link',
    href: '',
    class: 'btn btn-primary btn-block',
    text: 'commons.authorize',
    target: '_blank',
    showIf: { settingsType: 'advanced', botUsername: '' },
  }, 'bot')
  public botAuthorizeLink = null;

  @ui({
    type: 'link',
    href: '',
    class: 'btn btn-danger btn-block',
    text: 'commons.deauthorize',
    target: '_blank',
    showIf: { settingsType: 'advanced', botUsername: 'lengthAtLeast(1)' },
  }, 'bot')
  public botDeAuthorizeLink = null;

  constructor() {
    super();

    this.addMenu({ category: 'settings', name: 'core', id: 'settings/core' });
    setTimeout(() => {
      this.validateOAuth('bot');
      this.validateOAuth('broadcaster');
      this.getChannelId();
    }, 10000);
  }

  public async getChannelId() {
    if (!isMainThread || global.mocha) {
      return;
    }
    if (!areDecoratorsLoaded) {
      return setTimeout(() => this.getChannelId(), 1000);
    }
    clearTimeout(this.timeouts.getChannelId);

    let timeout = 1000;

    if (this.currentChannel !== this.generalChannel && this.generalChannel !== '') {
      const cid = await api.getIdFromTwitch(this.generalChannel, true);
      if (typeof cid !== 'undefined' && cid !== null) {
        this.currentChannel = this.generalChannel;
        this.channelId = cid;
        info('Channel ID set to ' + cid);
        tmi.reconnect('bot');
        tmi.reconnect('broadcaster');
        api.updateChannelViewsAndBroadcasterType();
        this.toWait = 10;
      } else {
        error(`Cannot get channel ID of ${this.generalChannel} - waiting ${this.toWait.toFixed()}s`);
        timeout = this.toWait * 1000;
        this.toWait = this.toWait * 2;
      }
    }

    this.timeouts.getChannelId = global.setTimeout(() => this.getChannelId(), timeout);
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
      case 'broadcaster.accessToken':
        this.validateOAuth('broadcaster');
        break;
      case 'bot.accessToken':
        this.validateOAuth('bot');
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
  public async validateOAuth(type: 'bot' | 'broadcaster') {
    if (!isMainThread || global.mocha) {
      return;
    }
    clearTimeout(this.timeouts[`validateOAuth-${type}`]);

    const url = 'https://id.twitch.tv/oauth2/validate';
    let status = true;
    try {
      if (['bot', 'broadcaster'].includes(type) && (this[type + 'AccessToken']) === '') {
        throw new Error('no access token for ' + type);
      } else if (!['bot', 'broadcaster'].includes(type)) {
        throw new Error(`Type ${type} is not supported`);
      }

      let request;
      try {
        request = await axios.get(url, {
          headers: {
            Authorization: 'OAuth ' + this[type + 'AccessToken'],
          },
        });
      } catch (e) {
        const errorMessage: string = e.data?.data ? `${e.data.data.status} — ${e.data.data.message}` : `${e.response.status} — ${e.response.statusText}`;
        throw new Error(`Error on validate ${type} OAuth token, error: ${errorMessage}`);
      }

      this.clientId = request.data.client_id;

      if (type === 'bot') {
        this.botId = request.data.user_id;
      } else {
        this.broadcasterId = request.data.user_id;
      }

      if (type === 'bot' && this.botId === this.broadcasterId) {
        warning('You shouldn\'t use same account for bot and broadcaster!');
      }

      this[type + 'CurrentScopes'] = request.data.scopes;
      this[type + 'Username'] = request.data.login;

      const cache = this.cache[type];
      if (cache !== '' && cache !== request.data.login + request.data.scopes.join(',')) {
        tmi.reconnect(type); // force TMI reconnect
        this.cache[type] = request.data.login + request.data.scopes.join(',');
      }

      setStatus('API', request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED);

      this.toWait = 10;
      this.getChannelId();
    } catch (e) {
      if (!e.message.includes('no access token')) {
        process.stderr.write(JSON.stringify(e) + '\n');
      }
      status = false;
      if ((this[type + 'RefreshToken']) !== '') {
        this.refreshAccessToken(type);
      } else {
        this[type + 'Username'] = '';
        this[type + 'CurrentScopes'] = [];

        if (type === 'bot') {
          this.botId = '';
        } else {
          this.broadcasterId = '';
        }
      }
    }
    this.timeouts[`validateOAuth-${type}`] = global.setTimeout(() => this.validateOAuth(type), 60000);
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
    if (!isMainThread) {
      return;
    }
    warning('Refreshing access token of ' + type);
    const url = 'https://twitchtokengenerator.com/api/refresh/';
    try {
      if (['bot', 'broadcaster'].includes(type) && (this[type + 'RefreshToken']) === '') {
        throw new Error('no refresh token for ' + type);
      } else if (!['bot', 'broadcaster'].includes(type)) {
        throw new Error(`Type ${type} is not supported`);
      }

      const request = await axios.post(url + encodeURIComponent(this[type + 'RefreshToken']));
      if (!request.data.success) {
        throw new Error(`Token refresh for ${type}: ${request.data.message}`);
      }
      if (typeof request.data.token !== 'string') {
        throw new Error(`Access token for ${type} was not correctly fetched (not a string)`);
      }
      if (typeof request.data.refresh !== 'string') {
        throw new Error(`Refresh token for ${type} was not correctly fetched (not a string)`);
      }
      this[type + 'AccessToken'] = request.data.token;
      this[type + 'RefreshToken'] = request.data.refresh;

      warning('Access token of ' + type + ' was refreshed.');
      warning('New access token of ' + type + ': ' + request.data.token);
      warning('New refresh token of ' + type + ': ' + request.data.refresh);
      this.validateOAuth(type);

      return request.data.token;
    } catch (e) {
      this[type + 'Username'] = '';
      this[type + 'CurrentScopes'] = [];

      if (type === 'bot') {
        this.botId = '';
      } else {
        this.broadcasterId = '';
      }

      error('Access token of ' + type + ' was not refreshed.');
      error(e.stack);
    }
  }
}

const _class = new OAuth();
export default _class;
