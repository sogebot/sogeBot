import axios from 'axios';
import { isMainThread } from 'worker_threads';

import Core from './_interface';
import constants from './constants';
import { settings, shared, ui } from './decorators';
import { onChange } from './decorators/on';

class OAuth extends Core {
  private toWait: number = 10;

  @shared()
  public cache: { bot: string; broadcaster: string } = { bot: '', broadcaster: '' };
  @shared()
  public currentChannel: string = '';
  @shared()
  public broadcasterType: string | null = null;
  @shared()
  public broadcaster: string = '';
  @shared()
  public bot: string = '';
  @shared()
  public clientId: string = '';
  @shared()
  public channelId: string = '';
  @shared()
  public botId: string = '';
  @shared()
  public broadcasterId: string = '';

  @settings('general')
  public generalChannel: string = '';

  @settings('general')
  public generalOwners: string[] = [];

  @settings('broadcaster')
  @ui({ type: 'text-input', secret: true })
  public broadcasterAccessToken: string = '';

  @settings('broadcaster')
  @ui({ type: 'text-input', secret: true })
  public broadcasterRefreshToken: string = '';

  @settings('broadcaster')
  @ui({ readOnly: true, type: 'text-input' })
  public broadcasterUsername: string = '';

  @settings('broadcaster', true)
  @ui({ type: 'check-list', current: 'broadcasterCurrentScopes' })
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
  }, 'broadcaster')
  public broadcasterGenerateLink: null = null;

  @settings('bot')
  @ui({ type: 'text-input', secret: true })
  public botAccessToken: string = '';

  @settings('bot')
  @ui({ type: 'text-input', secret: true })
  public botRefreshToken: string = '';

  @settings('bot')
  @ui({ readOnly: true, type: 'text-input' })
  public botUsername: string = '';

  @settings('bot', true)
  @ui({ type: 'check-list', current: 'botCurrentScopes' })
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
  }, 'bot')
  public botGenerateLink: null = null;

  constructor() {
    super();

    this.addMenu({ category: 'settings', name: 'core', id: 'core' });
    setTimeout(() => {
      this.validateOAuth('bot');
      this.validateOAuth('broadcaster');
      this.getChannelId();
    }, 10000);
  }

  public async getChannelId() {
    if (!isMainThread || global.mocha) { return; }
    if (typeof global.api === 'undefined' || typeof global.tmi === 'undefined') {
      return setTimeout(() => this.getChannelId(), 1000);
    }
    clearTimeout(this.timeouts.getChannelId);

    let timeout = 1000;

    if (this.currentChannel !== this.generalChannel && this.generalChannel !== '') {
      const cid = await global.api.getIdFromTwitch(this.generalChannel, true);
      if (typeof cid !== 'undefined' && cid !== null) {
        this.currentChannel = this.generalChannel;
        this.channelId = cid;
        global.log.info('Channel ID set to ' + cid);
        global.tmi.reconnect('bot');
        global.tmi.reconnect('broadcaster');
        global.api.updateChannelViewsAndBroadcasterType();
        this.toWait = 10;
      } else {
        global.log.error(`Cannot get channel ID of ${this.generalChannel} - waiting ${this.toWait.toFixed()}s`);
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
  public async validateOAuth(type: string) {
    if (!isMainThread || global.mocha) { return; }
    clearTimeout(this.timeouts[`validateOAuth-${type}`]);

    const url = 'https://id.twitch.tv/oauth2/validate';
    let status = true;
    try {
      if (['bot', 'broadcaster'].includes(type) && (this[type + 'AccessToken']) === '') {
        throw new Error('no access token for ' + type);
      } else if (!['bot', 'broadcaster'].includes(type)) {
        throw new Error(`Type ${type} is not supported`);
      }

      const request = await axios.get(url, {
        headers: {
          Authorization: 'OAuth ' + this[type + 'AccessToken'],
        },
      });
      this.clientId = request.data.client_id;

      if (type === 'bot') {
        this.botId = request.data.user_id;
      } else {
        this.broadcasterId = request.data.user_id;
      }

      if (type === 'bot' && this.botId === this.broadcasterId) {
        global.log.warning('You shouldn\'t use same account for bot and broadcaster!');
      }

      this[type + 'CurrentScopes'] = request.data.scopes;
      this[type + 'Username'] = request.data.login;

      const cache = this.cache[type];
      if (cache !== '' && cache !== request.data.login + request.data.scopes.join(',')) {
        global.tmi.reconnect(type); // force TMI reconnect
        this.cache[type] = request.data.login + request.data.scopes.join(',');
      }

      global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED;

      this.toWait = 10;
      this.getChannelId();
    } catch (e) {
      if (!e.message.includes('no access token')) {
        console.error(e);
      }
      status = false;
      if ((this[type + 'RefreshToken']) !== '') { this.refreshAccessToken(type); } else {
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
  public async refreshAccessToken(type: string) {
    if (!isMainThread) { return; }
    global.log.warning('Refreshing access token of ' + type);
    const url = 'https://twitchtokengenerator.com/api/refresh/';
    try {
      if (['bot', 'broadcaster'].includes(type) && (this[type + 'RefreshToken']) === '') {
        throw new Error('no refresh token for ' + type);
      } else if (!['bot', 'broadcaster'].includes(type)) {
        throw new Error(`Type ${type} is not supported`);
      }

      const request = await axios.post(url + encodeURIComponent(this[type + 'RefreshToken']));
      if (typeof request.data.token !== 'string') {
        throw new Error(`Access token for ${type} was not correctly fetched (not a string)`);
      }
      if (typeof request.data.refresh !== 'string') {
        throw new Error(`Refresh token for ${type} was not correctly fetched (not a string)`);
      }
      this[type + 'AccessToken'] = request.data.token;
      this[type + 'RefreshToken'] = request.data.refresh;

      global.log.warning('Access token of ' + type + ' was refreshed.');
      global.log.warning('New access token of ' + type + ': ' + request.data.token);
      global.log.warning('New refresh token of ' + type + ': ' + request.data.refresh);
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

      global.log.error('Access token of ' + type + ' was not refreshed.');
      global.log.error(e.stack);
    }
  }
}

export { OAuth };
