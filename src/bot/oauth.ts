import axios from 'axios';
import { isMainThread } from 'worker_threads';

import Core from './_interface';
import constants from './constants';
import { settings, shared, ui } from './decorators';
import { onchange } from './decorators/on';

class OAuth extends Core {
  @shared()
  public currentChannel: string = '';
  @shared()
  public broadcasterType: string = '';
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

  @settings({ category: 'general' })
  public generalChannel: string = '';

  @settings({ category: 'general' })
  public generalOwners: string[] = [];

  @settings({ category: 'broadcaster' })
  @ui({ type: 'text-input', secret: true })
  @onchange('onChangeAccessToken')
  public broadcasterAccessToken: string = '';

  @settings({ category: 'broadcaster' })
  @ui({ type: 'text-input', secret: true })
  public broadcasterRefreshToken: string = '';

  @settings({ category: 'broadcaster' })
  @ui({ readOnly: true, type: 'text-input' })
  @onchange('onChangeBroadcasterUsername')
  public broadcasterUsername: string = '';

  @settings({ category: 'broadcaster' })
  @ui({ type: 'check-list', current: 'broadcasterCurrentScopes' })
  public broadcasterExpectedScopes: string[] = [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'channel:read:subscriptions',
  ];

  @settings({ category: 'broadcaster' })
  @ui({ ignore: true })
  public broadcasterCurrentScopes: string[] = [];

  @settings({ category: 'broadcaster' })
  @ui({
    type: 'link',
    href: 'https://twitchtokengenerator.com/quick/RkshHUnw16',
    class: 'btn btn-primary btn-block',
    text: 'commons.generate',
    target: '_blank',
  })
  public broadcasterGenerateLink: null = null;

  @settings({ category: 'bot' })
  @ui({ type: 'text-input', secret: true })
  @onchange('onChangeAccessToken')
  public botAccessToken: string = '';

  @settings({ category: 'bot' })
  @ui({ type: 'text-input', secret: true })
  public botRefreshToken: string = '';

  @settings({ category: 'bot' })
  @ui({ readOnly: true, type: 'text-input' })
  public botUsername: string = '';

  @settings({ category: 'bot' })
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

  @settings({ category: 'bot' })
  @ui({ ignore: true })
  public botCurrentScopes: string[] = [];

  @settings({ category: 'bot' })
  @ui({
    type: 'link',
    href: 'https://twitchtokengenerator.com/quick/UQ6SHl81nt',
    class: 'btn btn-primary btn-block',
    text: 'commons.generate',
    target: '_blank',
  })
  public botGenerateLink: null = null;

  constructor() {
    super();

    this.addMenu({ category: 'settings', name: 'core', id: 'core' });
    this.validateOAuth('bot');
    this.validateOAuth('broadcaster');
    this.getChannelId();
  }

  public async getChannelId() {
    if (!isMainThread || global.mocha) { return; }
    if (typeof global.api === 'undefined' || typeof global.tmi === 'undefined') { return setTimeout(() => this.getChannelId(), 1000); }
    clearTimeout(this.timeouts.getChannelId);

    let timeout = 1000;
    if (this.currentChannel !== this.generalChannel && this.generalChannel !== '') {
      this.currentChannel = this.generalChannel;
      const cid = await global.api.getIdFromTwitch(this.generalChannel, true);
      if (typeof cid !== 'undefined' && cid !== null) {
        this.channelId = cid;
        global.log.info('Channel ID set to ' + cid);
        global.tmi.reconnect('bot');
        global.tmi.reconnect('broadcaster');
        global.api.updateChannelViewsAndBroadcasterType();
      } else {
        const toWait = Math.max(Number(global.api.calls.bot.refresh - (Date.now() / 1000)), 30);
        global.log.error(`Cannot get channel ID of ${this.generalChannel} - waiting ${toWait.toFixed()}s`);
        timeout = toWait * 1000;
      }
    }

    this.timeouts.getChannelId = setTimeout(() => this.getChannelId(), timeout);
  }

  public async onChangeBroadcasterUsername(key: string, value: any) {
    if (!this.generalOwners.includes(value)) {
      this.generalOwners.push(value);
    }
  }

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
   * and sets this.settings.<bot|broadcaster>.username
   * and sets this.settings.<bot|broadcaster>._scopes
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
      if (['bot', 'broadcaster'].includes(type) && (this[type + 'AccessToken']) === '') { throw new Error('no accessfresh token for ' + type); } else if (!['bot', 'broadcaster'].includes(type)) { throw new Error(`Type ${type} is not supported`); }

      const request = await axios.get(url, {
        headers: {
          Authorization: 'OAuth ' + this[type + 'AccessToken'],
        },
      });
      this.clientId = request.data.client_id;

      if (type === 'bot') { this.botId = request.data.user_id; } else { this.broadcasterId = request.data.user_id; }

      if (type === 'bot' && this.botId === this.broadcasterId) {
        global.log.warning('You shouldn\'t use same account for bot and broadcaster!');
      }

      this[type + 'ExpectedScopes'] = request.data.scopes;
      this[type + 'Username'] = request.data.login;

      const cache = this.settings._[type];
      if (cache !== '' && cache !== request.data.login + request.data.scopes.join(',')) {
        this.settings._[type] = request.data.login + request.data.scopes.join(',');
        global.tmi.reconnect(type); // force TMI reconnect
      }

      global.status.API = request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED;
    } catch (e) {
      status = false;
      if ((this[type + 'RefreshToken']) !== '') { this.refreshAccessToken(type); } else {
        this[type + 'Username'] = '';
        this[type + 'ExpectedScopes'] = [];

        if (type === 'bot') { this.botId = ''; } else { this.broadcasterId = ''; }
      }
    }
    this.timeouts[`validateOAuth-${type}`] = setTimeout(() => this.validateOAuth(type), 60000);
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
      if (['bot', 'broadcaster'].includes(type) && (this[type + 'RefreshToken']) === '') { throw new Error('no refresh token for ' + type); } else if (!['bot', 'broadcaster'].includes(type)) { throw new Error(`Type ${type} is not supported`); }

      const request = await axios.post(url + encodeURIComponent(this[type + 'RefreshToken']));
      this[type + 'AccessToken'] = request.data.token;
      this[type + 'RefreshToken'] = request.data.refresh;

      global.log.warning('Access token of ' + type + ' was refreshed.');
      return request.data.token;
    } catch (e) {
      this[type + 'Username'] = '';
      this[type + 'ExpectedScopes'] = [];

      if (type === 'bot') { this.botId = ''; } else { this.broadcasterId = ''; }

      global.log.error('Access token of ' + type + ' was not refreshed.');
    }
  }
}

export { OAuth };
