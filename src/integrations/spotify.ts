import crypto from 'crypto';
import { setTimeout } from 'timers/promises';

import { SpotifySongBan } from '@entity/spotify.js';
import { HOUR, SECOND } from '@sogebot/ui-helpers/constants.js';
import chalk from 'chalk';
import _ from 'lodash-es';
import SpotifyWebApi from 'spotify-web-api-node';

import Integration from './_interface.js';
import {
  onChange, onLoad, onStartup,
} from '../decorators/on.js';
import {
  command, default_permission, persistent, settings,
} from '../decorators.js';
import { Expects } from  '../expects.js';

import { isStreamOnline } from '~/helpers/api/index.js';
import { CommandError } from '~/helpers/commandError.js';
import { announce, prepare } from '~/helpers/commons/index.js';
import { debug, error, info, warning } from '~/helpers/log.js';
import { addUIError } from '~/helpers/panel/index.js';
import { ioServer } from '~/helpers/panel.js';
import { adminEndpoint } from '~/helpers/socket.js';

/*
 * How to integrate:
 * 1. Create app in https://beta.developer.spotify.com/dashboard/applications
 * 1a. Set redirect URI as http://whereYouAccessDashboard.com/oauth/spotify
 * 2. Update your clientId, clientSecret, redirectURI in Integrations UI
 * 3. Authorize your user through UI
 */

let currentSongHash = '';
let isTemporarilyUnavailable = false;

class Spotify extends Integration {
  client: null | SpotifyWebApi = null;
  retry: { IRefreshToken: number } = { IRefreshToken: 0 };
  state: any = null;

  isUnauthorized = true;
  userId: string | null = null;

  lastActiveDeviceId = '';
  @settings('connection')
    manualDeviceId = '';

  @persistent()
    songsHistory: string[] = [];
  currentSong = JSON.stringify(null as null | {
    started_at: number; song: string; artist: string; artists: string, uri: string; is_playing: boolean; is_enabled: boolean;
  });

  @settings()
    _accessToken: string | null = null;
  @settings()
    _refreshToken: string | null = null;
  @settings()
    songRequests = true;
  @settings()
    fetchCurrentSongWhenOffline = false;
  @settings()
    queueWhenOffline = false;
  @settings()
    notify = false;
  @settings()
    allowApprovedArtistsOnly = false;
  @settings()
    approvedArtists = []; // uris or names

  @settings('customization')
    format = '$song - $artist';

  @settings('connection')
    clientId = '';
  @settings('connection')
    clientSecret = '';
  @settings('connection')
    redirectURI = 'http://localhost:20000/credentials/oauth/spotify'; // TODO: remove after old ui is removed
  @settings('connection')
    username = '';

  scopes: string[] = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify',
    'playlist-read-collaborative',
    'playlist-modify-private',
    'playlist-read-private',
    'user-modify-playback-state',
  ];

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'manage', name: 'spotifybannedsongs', id: 'manage/spotify/bannedsongs', this: this,
    });

    setInterval(() => this.IRefreshToken(), HOUR);
    setInterval(() => this.ICurrentSong(), 10000);
    setInterval(() => {
      this.getMe();
      this.getActiveDevice();
    }, 30000);
  }

  @onLoad('songsHistory')
  onSongsHistoryLoad() {
    setInterval(() => {
      const currentSong = JSON.parse(this.currentSong);
      if (currentSong !== null) {
        // we need to exclude is_playing and is_enabled from currentSong
        const currentSongWithoutAttributes = JSON.stringify({
          started_at: currentSong.started_at,
          song:       currentSong.song,
          artist:     currentSong.artist,
          artists:    currentSong.artists,
          uri:        currentSong.uri,
        });

        if (currentSongHash !== currentSongWithoutAttributes) {
          currentSongHash = currentSongWithoutAttributes;
          const message = prepare('integrations.spotify.song-notify', { name: currentSong.song, artist: currentSong.artist });
          debug('spotify.song', message);
          if (this.notify) {
            announce(message, 'songs');
          }
        }

        if (!this.songsHistory.includes(currentSongWithoutAttributes)) {
          this.songsHistory.push(currentSongWithoutAttributes);
        }
        // keep only 10 latest songs + 1 current
        if (this.songsHistory.length > 11) {
          this.songsHistory.splice(0, 1);
        }
      } else {
        currentSongHash = '';
      }
    }, 5 * SECOND);
  }

  @onChange('connection.username')
  onUsernameChange (key: string, value: string) {
    if (value.length > 0) {
      info(chalk.yellow('SPOTIFY: ') + `Access to account ${value} granted`);
    }
  }

  @onChange('redirectURI')
  @onChange('clientId')
  @onChange('clientSecret')
  onConnectionVariablesChange () {
    this.currentSong = JSON.stringify(null);
    this.disconnect();
    if (this.enabled) {
      this.isUnauthorized = false;
      this.connect();
      this.getMe();
    }
  }

  @onStartup()
  @onChange('enabled')
  onStateChange (key: string, value: boolean) {
    this.currentSong = JSON.stringify(null);
    if (value) {
      this.connect();
      this.getMe();
    } else {
      this.disconnect();
    }
  }

  @command('!spotify history')
  async cHistory(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (this.songsHistory.length <= 1) {
        // we are expecting more than 1 song (current)
        throw new CommandError('no-songs-found-in-history');
      }
      const numOfSongs = new Expects(opts.parameters).number({ optional: true }).toArray()[0];
      if (!numOfSongs || numOfSongs <= 1) {
        const latestSong: any = JSON.parse(this.songsHistory[this.songsHistory.length - 2]);
        return [{
          response: prepare('integrations.spotify.return-one-song-from-history', {
            artists: latestSong.artists, artist: latestSong.artist, uri: latestSong.uri, name: latestSong.song,
          }), ...opts,
        }];
      } else {
        // return songs in desc order (excl. current song)
        const actualNumOfSongs = Math.min(this.songsHistory.length - 1, numOfSongs, 10);
        const responses = [
          { response: prepare('integrations.spotify.return-multiple-song-from-history', { count: actualNumOfSongs }), ...opts },
        ];
        const lowestIndex = Math.max(0, this.songsHistory.length - actualNumOfSongs);
        for (let index = this.songsHistory.length - 1; index >= lowestIndex ; index--) {
          if (index - 1 < 0) {
            break;
          }

          const song: any = JSON.parse(this.songsHistory[index - 1]);
          responses.push({
            response: prepare('integrations.spotify.return-multiple-song-from-history-item', {
              index:   responses.length,
              artists: song.artists, artist:  song.artist, uri:     song.uri, name:    song.song,
            }), ...opts,
          });
        }
        return responses;
      }
    } catch (e: any) {
      if (e instanceof CommandError) {
        return [{ response: prepare('integrations.spotify.' + e.message), ...opts }];
      } else {
        error(e.stack);
      }
    }
    return [];
  }

  get deviceId () {
    if (this.manualDeviceId.length > 0) {
      return this.manualDeviceId;
    }

    if (this.lastActiveDeviceId.length > 0) {
      return this.lastActiveDeviceId;
    }

    return undefined;
  }

  @command('!spotify skip')
  @default_permission(null)
  async cSkipSong() {
    if (this.client) {
      this.client.skipToNext({ device_id: this.deviceId });
      ioServer?.emit('api.stats', {
        method: 'POST', data: 'n/a', timestamp: Date.now(), call: 'spotify::skip', api: 'other', endpoint: 'n/a', code: 200,
      });
    }
    return [];
  }

  async getActiveDevice() {
    try {
      if (this.enabled && !this.isUnauthorized) {
        const request = await this.client?.getMyDevices();
        if (request) {
          const activeDevice = request.body.devices.find(o => o.is_active);
          if (activeDevice && this.lastActiveDeviceId !== activeDevice.id) {
            info(`SPOTIFY: new active device found, set to ${activeDevice.id}`);
            this.lastActiveDeviceId = activeDevice.id ?? 'n/a';
          }
        }
      }
    } catch (e: any) {
      if (String(e.statusCode).startsWith('5')) {
        // skip all 5xx errors
        return;
      }
      error('SPOTIFY: cannot get active device, please reauthenticate to include scope user-read-playback-state');
      error(e.stack);
    }
  }

  async getMe () {
    try {
      if ((this.enabled) && !_.isNil(this.client) && !this.isUnauthorized) {
        const data = await this.client.getMe();

        this.username = data.body.display_name ? data.body.display_name : data.body.id;
        if (this.userId !== data.body.id) {
          info(chalk.yellow('SPOTIFY: ') + `Logged in as ${this.username}#${data.body.id}`);
        }
        this.userId = data.body.id;

        isTemporarilyUnavailable = false;
      }
    } catch (e: any) {
      if (String(e.statusCode).startsWith('5')) {
        // skip all 5xx errors
        return;
      }
      if (e.message.includes('The access token expired.') || e.message.includes('No token provided.')) {
        debug('spotify.user', 'Get of user failed, incorrect or missing access token. Refreshing token and retrying.');
        this.IRefreshToken();
      } else if (e.message.includes('temporarily_unavailable')) {
        if (!isTemporarilyUnavailable) {
          isTemporarilyUnavailable = true;
          info(chalk.yellow('SPOTIFY: ') + 'Spotify is temporarily unavailable');
        }
        return;
      } else if (e.message !== 'Unauthorized') {
        if (!this.isUnauthorized) {
          this.isUnauthorized = true;
          info(chalk.yellow('SPOTIFY: ') + 'Get of user failed, check your credentials');
          debug('spotify.user', e.stack);
        }
      }
      this.username = '';
      this.userId = null;
    }
  }

  async ICurrentSong () {
    try {
      if (!this.fetchCurrentSongWhenOffline && !(isStreamOnline.value)) {
        throw Error('Stream is offline');
      }
      if (this.client === null) {
        throw Error('Spotify Web Api not connected');
      }
      const data = await this.client.getMyCurrentPlayingTrack();
      if (!data.body.item || data.body.item.type === 'episode') {
        throw Error('No song was received from spotify');
      }

      let currentSong = JSON.parse(this.currentSong);
      if (currentSong === null || currentSong.song !== data.body.item.name) {
        currentSong = {
          started_at: Date.now(), // important for song history
          song:       data.body.item.name,
          artist:     data.body.item.artists[0].name,
          artists:    data.body.item.artists.map(o => o.name).join(', '),
          uri:        data.body.item.uri,
          is_playing: data.body.is_playing,
          is_enabled: this.enabled,
        };
      }
      currentSong.is_playing = data.body.is_playing;
      currentSong.is_enabled = this.enabled;
      this.currentSong = JSON.stringify(currentSong);
    } catch (e: any) {
      if (e instanceof Error) {
        debug('spotify.song', e.stack || e.message);
      }
      this.currentSong = JSON.stringify(null);
    }
  }

  async IRefreshToken () {
    if (this.retry.IRefreshToken < 5) {
      try {
        if (!_.isNil(this.client) && this._refreshToken) {
          const data = await this.client.refreshAccessToken();
          this.client.setAccessToken(data.body.access_token);
          this.isUnauthorized = false;

          this.retry.IRefreshToken = 0;
          isTemporarilyUnavailable = false;
          ioServer?.emit('api.stats', {
            method: 'GET', data: data.body, timestamp: Date.now(), call: 'spotify::refreshToken', api: 'other', endpoint: 'n/a', code: 200,
          });
        }
      } catch (e: any) {
        if (e.message.includes('temporarily_unavailable')) {
          if (!isTemporarilyUnavailable) {
            isTemporarilyUnavailable = true;
            info(chalk.yellow('SPOTIFY: ') + 'Spotify is temporarily unavailable');
          }
          setTimeout(10000).then(() => {
            this.IRefreshToken();
          });
          return;
        }
        this.retry.IRefreshToken++;
        ioServer?.emit('api.stats', {
          method: 'GET', data: e.message, timestamp: Date.now(), call: 'spotify::refreshToken', api: 'other', endpoint: 'n/a', code: 500,
        });
        info(chalk.yellow('SPOTIFY: ') + 'Refreshing access token failed ' + (this.retry.IRefreshToken > 0 ? 'retrying #' + this.retry.IRefreshToken : ''));
        info(e.stack);
        setTimeout(10000).then(() => {
          this.IRefreshToken();
        });
      }
    }

    if (this.retry.IRefreshToken >= 5) {
      addUIError({ name: 'SPOTIFY', message: 'Refreshing access token failed. Revoking access.' });
      this.userId = null;
      this._accessToken = null;
      this._refreshToken = null;
      this.username = '';
      this.currentSong = JSON.stringify(null);
    }
  }

  sockets () {
    adminEndpoint('/integrations/spotify', 'spotify::state', async (callback) => {
      callback(null, this.state);
    });
    adminEndpoint('/integrations/spotify', 'spotify::skip', async (callback) => {
      this.cSkipSong();
      callback(null);
    });
    adminEndpoint('/integrations/spotify', 'spotify::addBan', async (spotifyUri, cb) => {
      try {
        if (!this.client) {
          addUIError({ name: 'Spotify Ban Import', message: 'You are not connected to spotify API, authorize your user' });
          throw Error('client');
        }
        let id = '';
        if (spotifyUri.startsWith('spotify:')) {
          id = spotifyUri.replace('spotify:track:', '');
        } else {
          const regex = new RegExp('\\S+open\\.spotify\\.com\\/track\\/(\\w+)(.*)?', 'gi');
          const exec = regex.exec(spotifyUri as unknown as string);
          if (exec) {
            id = exec[1];
          } else {
            throw Error('ID was not found in ' + spotifyUri);
          }
        }

        const response = await this.client.getTrack(id);

        ioServer?.emit('api.stats', {
          method: 'GET', data: response.body, timestamp: Date.now(), call: 'spotify::addBan', api: 'other', endpoint: 'n/a', code: 200,
        });

        const track = response.body;
        const songBan = SpotifySongBan.create({
          artists: track.artists.map(o => o.name), spotifyUri: track.uri, title: track.name,
        });
        await songBan.save();
      } catch (e: any) {
        if (e.message !== 'client') {
          if (cb) {
            cb(e);
          }
          addUIError({ name: 'Spotify Ban Import', message: 'Something went wrong with banning song. Check your spotifyURI.' });
        }
        ioServer?.emit('api.stats', {
          method: 'GET', data: e.response, timestamp: Date.now(), call: 'spotify::addBan', api: 'other', endpoint: 'n/a', code: 'n/a',
        });
        if (cb) {
          cb(e);
        }
      }
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/integrations/spotify', 'spotify::deleteBan', async (where, cb) => {
      where = where || {};
      if (cb) {
        await SpotifySongBan.delete(where);
        cb(null);
      }
    });
    adminEndpoint('/integrations/spotify', 'spotify::getAllBanned', async (where, cb) => {
      where = where || {};
      if (cb) {
        cb(null, await SpotifySongBan.find(where));
      }
    });
    const setCode = async (token: string, cb: any) => {
      const waitForUsername = () => {
        return new Promise((resolve) => {
          const check = async () => {
            if (this.client) {
              this.client.getMe()
                .then((data) => {
                  this.username = data.body.display_name ? data.body.display_name : data.body.id;
                  resolve(true);
                })
                .catch(() => {
                  setTimeout(10000).then(() => {
                    check();
                  });
                });
            } else {
              resolve(true);
            }
          };
          check();
        });
      };

      this.currentSong = JSON.stringify(null);
      this.connect({ token });
      await waitForUsername();
      setTimeout(10000).then(() => this.isUnauthorized = false);
      cb(null, true);
    };
    adminEndpoint('/integrations/spotify', 'code', async (token, cb) => {
      this.redirectURI = 'https://dash.sogebot.xyz/credentials/spotify';
      setCode(token, cb);
    });
    adminEndpoint('/integrations/spotify', 'spotify::code', async (token, cb) => {
      setCode(token, cb);
    });
    adminEndpoint('/integrations/spotify', 'spotify::revoke', async (cb) => {
      clearTimeout(this.timeouts.IRefreshToken);
      try {
        if (this.client !== null) {
          this.client.resetAccessToken();
          this.client.resetRefreshToken();
        }

        const username = this.username;
        this.userId = null;
        this._accessToken = null;
        this._refreshToken = null;
        this.username = '';
        this.currentSong = JSON.stringify(null);

        info(chalk.yellow('SPOTIFY: ') + `Access to account ${username} is revoked`);

        cb(null, { do: 'refresh' });
      } catch (e: any) {
        cb(e.stack);
      } finally {
        this.timeouts.IRefreshToken = global.setTimeout(() => this.IRefreshToken(), 60000);
      }
    });
    adminEndpoint('/integrations/spotify', 'spotify::authorize', async (cb) => {
      if (
        this.clientId === ''
        || this.clientSecret === ''
      ) {
        cb('Cannot authorize! Missing clientId or clientSecret. Please save before authorizing.', null);
      } else {
        try {
          const authorizeURI = this.authorizeURI();
          if (!authorizeURI) {
            error('Integration must be enabled to authorize');
            cb('Integration must enabled to authorize');
          } else {
            cb(null, { do: 'redirect', opts: [authorizeURI] });
          }
        } catch (e: any) {
          error(e.stack);
          cb(e.stack, null);
        }
      }
    });
  }

  connect (opts: { token?: string } = {}) {
    const isNewConnection = this.client === null;
    try {
      const err: string[] = [];
      if (this.clientId.trim().length === 0) {
        err.push('clientId');
      }
      if (this.clientSecret.trim().length === 0) {
        err.push('clientSecret');
      }
      if (this.redirectURI.trim().length === 0) {
        err.push('redirectURI');
      }
      if (err.length > 0) {
        throw new Error(err.join(', ') + ' missing');
      }

      this.client = new SpotifyWebApi({
        clientId:     this.clientId,
        clientSecret: this.clientSecret,
        redirectUri:  this.redirectURI,
      });

      if (this._refreshToken) {
        this.client.setRefreshToken(this._refreshToken);
        this.IRefreshToken();
        this.retry.IRefreshToken = 0;
      }

      try {
        if (opts.token && !_.isNil(this.client)) {
          this.client.authorizationCodeGrant(opts.token)
            .then((data) => {
              this._accessToken = data.body.access_token;
              this._refreshToken = data.body.refresh_token;

              if (this.client) {
                this.client.setAccessToken(this._accessToken);
                this.client.setRefreshToken(this._refreshToken);
              }
              this.retry.IRefreshToken = 0;
            }, (authorizationError) => {
              if (authorizationError) {
                addUIError({ name: 'SPOTIFY', message: 'Getting of accessToken and refreshToken failed.' });
                info(chalk.yellow('SPOTIFY: ') + 'Getting of accessToken and refreshToken failed');
              }
            });
        }
        if (isNewConnection) {
          info(chalk.yellow('SPOTIFY: ') + 'Client connected to service');
        }
      } catch (e: any) {
        error(e.stack);
        addUIError({ name: 'SPOTIFY', message: 'Client connection failed.' });
        info(chalk.yellow('SPOTIFY: ') + 'Client connection failed');
      }
    } catch (e: any) {
      info(chalk.yellow('SPOTIFY: ') + e.message);
    }
  }

  disconnect () {
    this.client = null;
    info(chalk.yellow('SPOTIFY: ') + 'Client disconnected from service');
  }

  authorizeURI () {
    if (_.isNil(this.client)) {
      return null;
    }
    const state = crypto.createHash('md5').update(Math.random().toString()).digest('hex');
    this.state = state;
    return this.client.createAuthorizeURL(this.scopes, state) + '&show_dialog=true';
  }

  @command('!spotify unban')
  @default_permission(null)
  async unban (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const songToUnban = await SpotifySongBan.findOneOrFail({ where: { spotifyUri: opts.parameters } });
      await SpotifySongBan.delete({ spotifyUri: opts.parameters });
      return [{
        response: prepare('integrations.spotify.song-unbanned', {
          artist: songToUnban.artists[0], uri: songToUnban.spotifyUri, name: songToUnban.title,
        }), ...opts,
      }];
    } catch (e: any) {
      return [{ response: prepare('integrations.spotify.song-not-found-in-banlist', { uri: opts.parameters }), ...opts }];
    }
  }

  @command('!spotify ban')
  @default_permission(null)
  async ban (opts: CommandOptions): Promise<CommandResponse[]> {
    if (!this.client) {
      error(`${chalk.bgRed('SPOTIFY')}: you are not connected to spotify API, authorize your user.`);
      return [];
    }

    // ban current playing song only
    const currentSong: any = JSON.parse(this.currentSong);
    if (Object.keys(currentSong).length === 0) {
      return [{ response: prepare('integrations.spotify.not-banned-song-not-playing'), ...opts }];
    } else {
      const songBan = SpotifySongBan.create({
        artists: currentSong.artists.split(', '), spotifyUri: currentSong.uri, title: currentSong.song,
      });
      await songBan.save();
      this.cSkipSong();
      return [{
        response: prepare('integrations.spotify.song-banned', {
          artists: currentSong.artists, artist: currentSong.artist, uri: currentSong.uri, name: currentSong.song,
        }), ...opts,
      }];
    }
  }

  @command('!spotify')
  @default_permission(null)
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    if (!isStreamOnline.value && !this.queueWhenOffline) {
      error(`${chalk.bgRed('SPOTIFY')}: stream is offline and you have disabled queue when offline.`);
      return [];
    } // don't do anything on offline stream*/
    if (!this.songRequests) {
      error(`${chalk.bgRed('SPOTIFY')}: song requests are disabled.`);
      return [];
    }
    if (!this.client) {
      error(`${chalk.bgRed('SPOTIFY')}: you are not connected to spotify API, authorize your user.`);
      return [];
    }

    try {
      const [spotifyId] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (spotifyId.startsWith('spotify:') || spotifyId.startsWith('https://open.spotify.com/track/')) {
        let id = '';
        if (spotifyId.startsWith('spotify:')) {
          id = spotifyId.replace('spotify:track:', '');
        } else {
          const regex = new RegExp('\\S+open\\.spotify\\.com\\/track\\/(\\w+)(.*)?', 'gi');
          const exec = regex.exec(spotifyId);
          if (exec) {
            id = exec[1];
          } else {
            throw Error('ID was not found in ' + spotifyId);
          }
        }
        debug('spotify.request', `Searching song with id ${id}`);

        const response = await Promise.race([
          new Promise<Awaited<ReturnType<typeof this.client.getTrack>>>((resolve) => {
            if (this.client) {
              this.client.getTrack(id).then(data => resolve(data));
            }
          }),
          new Promise<null>((resolve) => {
            setTimeout(10 * SECOND).then(() => resolve(null));
          }),
        ]);

        if (response === null) {
          warning('Spotify didn\'t get track in time. Reconnecting client and retrying request.');
          await this.connect();
          return this.main(opts);
        }

        debug('spotify.request', `Response => ${JSON.stringify({ response }, null, 2)}`);
        ioServer?.emit('api.stats', {
          method: 'GET', data: response.body, timestamp: Date.now(), call: 'spotify::search', api: 'other', endpoint: 'n/a', code: response.statusCode,
        });

        const track = response.body;

        if (this.allowApprovedArtistsOnly && this.approvedArtists.find((item) => {
          return track.artists.find(artist => artist.name === item || artist.uri === item);
        }) === undefined) {
          return [{ response: prepare('integrations.spotify.cannot-request-song-from-unapproved-artist', { name: track.name, artist: track.artists[0].name }), ...opts }];
        }

        if(await this.requestSongByAPI(track.uri)) {
          return [{
            response: prepare('integrations.spotify.song-requested', {
              name: track.name, artist: track.artists[0].name, artists: track.artists.map(o => o.name).join(', '),
            }), ...opts,
          }];
        } else {
          return [{
            response: prepare('integrations.spotify.cannot-request-song-is-banned', {
              name: track.name, artist: track.artists[0].name, artists: track.artists.map(o => o.name).join(', '),
            }), ...opts,
          }];
        }
      } else {
        const response = await Promise.race([
          new Promise<Awaited<ReturnType<typeof this.client.searchTracks>>>((resolve) => {
            if (this.client) {
              this.client.searchTracks(spotifyId).then(data => resolve(data));
            }
          }),
          new Promise<null>((resolve) => {
            setTimeout(10 * SECOND).then(() => resolve(null));
          }),
        ]);

        if (response === null) {
          warning('Spotify didn\'t get track in time. Reconnecting client and retrying request.');
          await this.connect();
          return this.main(opts);
        }
        ioServer?.emit('api.stats', {
          method: 'GET', data: response.body, timestamp: Date.now(), call: 'spotify::search', api: 'other', endpoint: 'n/a', code: response.statusCode,
        });

        if (!response.body.tracks || response.body.tracks.items.length === 0) {
          throw new Error('Song not found');
        }

        const track =  response.body.tracks.items[0];
        if (this.allowApprovedArtistsOnly && this.approvedArtists.find((item) => {
          return track.artists.find(artist => artist.name === item || artist.uri === item);
        }) === undefined) {
          return [{ response: prepare('integrations.spotify.cannot-request-song-from-unapproved-artist', { name: track.name, artist: track.artists[0].name }), ...opts }];
        }

        if(await this.requestSongByAPI(track.uri)) {
          return [{ response: prepare('integrations.spotify.song-requested', { name: track.name, artist: track.artists[0].name }), ...opts }];
        } else {
          return [{ response: prepare('integrations.spotify.cannot-request-song-is-banned', { name: track.name, artist: track.artists[0].name }), ...opts }];
        }
      }
    } catch (e: any) {
      debug('spotify.request', e.stack);
      if (e.message === 'PREMIUM_REQUIRED') {
        error('Spotify Premium is required to request a song.');
      } else if (e.message !== 'Song not found') {
        throw e;
      }
      return [{ response: prepare('integrations.spotify.song-not-found'), ...opts }];
    }
  }

  async requestSongByAPI(uri: string) {
    if (this.client) {
      try {
        const isSongBanned = (await SpotifySongBan.count({ where: { spotifyUri: uri } })) > 0;
        if (isSongBanned) {
          return false;
        }

        const queueResponse = await this.client.addToQueue(uri, { device_id: this.deviceId });
        ioServer?.emit('api.stats', {
          method: 'POST', data: queueResponse.body, timestamp: Date.now(), call: 'spotify::queue', api: 'other', endpoint: 'https://api.spotify.com/v1/me/player/queue?uri=' + uri, code: queueResponse.statusCode,
        });
        return true;
      } catch (e: any) {
        if (e.stack.includes('WebapiPlayerError')) {
          if (e.message.includes('NO_ACTIVE_DEVICE')) {
            throw new Error('NO_ACTIVE_DEVICE');
          }
          if (e.message.includes('PREMIUM_REQUIRED')) {
            throw new Error('PREMIUM_REQUIRED');
          }
          error(e.message);
          return false;
        } else {
          // rethrow error
          throw(e);
        }
      }
    }
  }
}

const _spotify = new Spotify();
export default _spotify;