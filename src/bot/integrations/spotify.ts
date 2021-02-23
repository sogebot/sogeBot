import crypto from 'crypto';

import chalk from 'chalk';
import _ from 'lodash';
import SpotifyWebApi from 'spotify-web-api-node';
import { getRepository } from 'typeorm';

import { HOUR, SECOND } from '../constants';
import { SpotifySongBan } from '../database/entity/spotify';
import {
  command, default_permission, persistent, settings, ui,
} from '../decorators';
import {
  onChange, onLoad, onStartup,
} from '../decorators/on';
import Expects from '../expects';
import { isStreamOnline } from '../helpers/api';
import { CommandError } from '../helpers/commandError';
import { announce, prepare } from '../helpers/commons';
import { error, info } from '../helpers/log';
import { ioServer } from '../helpers/panel';
import { addUIError } from '../helpers/panel/';
import { adminEndpoint } from '../helpers/socket';
import Integration from './_interface';

/*
 * How to integrate:
 * 1. Create app in https://beta.developer.spotify.com/dashboard/applications
 * 1a. Set redirect URI as http://whereYouAccessDashboard.com/oauth/spotify
 * 2. Update your clientId, clientSecret, redirectURI in Integrations UI
 * 3. Authorize your user through UI
 */

let _spotify: any = null;
let currentSongHash = '';
let firstAuthorizationDone = false;

class Spotify extends Integration {
  client: null | SpotifyWebApi = null;
  retry: { IRefreshToken: number } = { IRefreshToken: 0 };
  state: any = null;

  isUnauthorized = false;
  userId: string | null = null;

  @persistent()
  songsHistory: string[] = [];
  currentSong: string = JSON.stringify({});

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

  @settings('customization')
  format = '$song - $artist';

  @settings('connection')
  @ui({ type: 'text-input', secret: true })
  clientId = '';
  @settings('connection')
  @ui({ type: 'text-input', secret: true })
  clientSecret = '';
  @settings('connection')
  redirectURI = 'http://localhost:20000/oauth/spotify';
  @settings('connection')
  @ui({ type: 'text-input', readOnly: true })
  username = '';

  scopes: string[] = [
    'user-read-currently-playing',
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify',
    'playlist-read-collaborative',
    'playlist-modify-private',
    'playlist-read-private',
    'user-modify-playback-state' ];

  @ui({
    type:  'btn-emit',
    class: 'btn btn-primary btn-block mt-1 mb-1',
    if:    () => _spotify.username.length === 0,
    emit:  'spotify::authorize',
  }, 'connection')
  authorizeBtn = null;

  @ui({
    type:  'btn-emit',
    class: 'btn btn-primary btn-block mt-1 mb-1',
    if:    () => _spotify.username.length > 0,
    emit:  'spotify::revoke',
  }, 'connection')
  revokeBtn = null;

  @onStartup()
  onStartup() {
    this.addWidget('spotify', 'widget-title-spotify', 'fab fa-spotify');
    this.addMenu({
      category: 'manage', name: 'spotifybannedsongs', id: 'manage/spotify/bannedsongs', this: this,
    });

    this.timeouts.IRefreshToken = global.setTimeout(() => this.IRefreshToken(), 60000);
    this.timeouts.ICurrentSong = global.setTimeout(() => this.ICurrentSong(), 10000);
    this.timeouts.getMe = global.setTimeout(() => this.getMe(), 10000);
  }

  @onLoad('songsHistory')
  onSongsHistoryLoad() {
    setInterval(() => {
      if (this.currentSong !== '{}') {
        // we need to exclude is_playing and is_enabled from currentSong
        const currentSong = JSON.parse(this.currentSong);
        const currentSongWithoutAttributes = JSON.stringify({
          started_at: currentSong.started_at,
          song:       currentSong.song,
          artist:     currentSong.artist,
          artists:    currentSong.artists,
          uri:        currentSong.uri,
        });

        if (currentSongHash !== currentSongWithoutAttributes) {
          currentSongHash = currentSongWithoutAttributes;
          if (this.notify) {
            const message = prepare('integrations.spotify.song-notify', { name: currentSong.song, artist: currentSong.artist });
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
    this.currentSong = JSON.stringify({});
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
    this.currentSong = JSON.stringify({});
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
    } catch (e) {
      if (e instanceof CommandError) {
        return [{ response: prepare('integrations.spotify.' + e.message), ...opts }];
      } else {
        error(e.stack);
      }
    }
    return [];
  }

  @command('!spotify skip')
  @default_permission(null)
  async cSkipSong() {
    if (this.client) {
      this.client.skipToNext();
      ioServer?.emit('api.stats', {
        method: 'POST', data: 'n/a', timestamp: Date.now(), call: 'spotify::skip', api: 'other', endpoint: 'n/a', code: 200,
      });
    }
    return [];
  }

  async getMe () {
    clearTimeout(this.timeouts.getMe);

    try {
      if ((this.enabled) && !_.isNil(this.client) && !this.isUnauthorized) {
        const data = await this.client.getMe();
        this.username = data.body.display_name ? data.body.display_name : data.body.id;
        if (this.userId !== data.body.id) {
          info(chalk.yellow('SPOTIFY: ') + `Logged in as ${this.username}#${data.body.id}`);
        }
        this.userId = data.body.id;
      }
    } catch (e) {
      if (e.message.includes('The access token expired.')) {
        await this.IRefreshToken();
        if (firstAuthorizationDone) {
          info(chalk.yellow('SPOTIFY: ') + 'Get of user failed, incorrect access token. Refreshing token and retrying.');
        }
        firstAuthorizationDone = true;
        this.getMe();
      } else  if (e.message !== 'Unauthorized') {
        this.isUnauthorized = true;
        info(chalk.yellow('SPOTIFY: ') + 'Get of user failed, check your credentials');
      }
      this.username = '';
      this.userId = null;
    }
    this.timeouts.getMe = global.setTimeout(() => this.getMe(), 30000);
  }

  async ICurrentSong () {
    clearTimeout(this.timeouts.ICurrentSong);

    try {
      if (!this.fetchCurrentSongWhenOffline && !(isStreamOnline.value)) {
        throw Error('Stream is offline');
      }
      if (this.client === null) {
        throw Error('Spotify Web Api not connected');
      }
      const data = await this.client.getMyCurrentPlayingTrack();
      if (data.body.item === null) {
        throw Error('No song was received from spotify');
      }

      let currentSong = JSON.parse(this.currentSong);
      if (typeof currentSong.song === 'undefined' || currentSong.song !== data.body.item.name) {
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
    } catch (e) {
      this.currentSong = JSON.stringify({});
    }
    this.timeouts.ICurrentSong = global.setTimeout(() => this.ICurrentSong(), 5000);
  }

  async IRefreshToken () {
    clearTimeout(this.timeouts.IRefreshToken);

    if (this.retry.IRefreshToken < 5) {
      try {
        if (!_.isNil(this.client) && this._refreshToken) {
          const data = await this.client.refreshAccessToken();
          this.client.setAccessToken(data.body.access_token);
          this.retry.IRefreshToken = 0;
          ioServer?.emit('api.stats', {
            method: 'GET', data: data.body, timestamp: Date.now(), call: 'spotify::refreshToken', api: 'other', endpoint: 'n/a', code: 200,
          });
        }
      } catch (e) {
        this.retry.IRefreshToken++;
        ioServer?.emit('api.stats', {
          method: 'GET', data: e.message, timestamp: Date.now(), call: 'spotify::refreshToken', api: 'other', endpoint: 'n/a', code: 500,
        });
        info(chalk.yellow('SPOTIFY: ') + 'Refreshing access token failed ' + (this.retry.IRefreshToken > 0 ? 'retrying #' + this.retry.IRefreshToken : ''));
      }
    }

    if (this.retry.IRefreshToken >= 5) {
      addUIError({ name: 'SPOTIFY', message: 'Refreshing access token failed.' });
    }
    this.timeouts.IRefreshToken = global.setTimeout(() => this.IRefreshToken(), HOUR);
  }

  sockets () {
    adminEndpoint(this.nsp, 'spotify::state', async (callback) => {
      callback(null, this.state);
    });
    adminEndpoint(this.nsp, 'spotify::skip', async (callback) => {
      this.cSkipSong();
      callback(null);
    });
    adminEndpoint(this.nsp, 'spotify::addBan', async (spotifyUri, cb) => {
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
          method: 'GET', data: response.body, timestamp: Date.now(), call: 'spotify::addBan', api: 'other', endpoint: response.headers.url, code: response.statusCode,
        });

        const track = response.body;
        await getRepository(SpotifySongBan).save({
          artists: track.artists.map(o => o.name), spotifyUri: track.uri, title: track.name,
        });
      } catch (e) {
        if (e.message !== 'client') {
          addUIError({ name: 'Spotify Ban Import', message: 'Something went wrong with banning song. Check your spotifyURI.' });
        }
        ioServer?.emit('api.stats', {
          method: 'GET', data: e.response, timestamp: Date.now(), call: 'spotify::addBan', api: 'other', endpoint: e.response.headers.url, code: e.response?.status ?? 'n/a',
        });
      }
      if (cb) {
        cb(null, null);
      }
    });
    adminEndpoint(this.nsp, 'spotify::deleteBan', async (where, cb) => {
      where = where || {};
      if (cb) {
        cb(null, await getRepository(SpotifySongBan).delete(where));
      }
    });
    adminEndpoint(this.nsp, 'spotify::getAllBanned', async (where, cb) => {
      where = where || {};
      if (cb) {
        cb(null, await getRepository(SpotifySongBan).find(where));
      }
    });
    adminEndpoint(this.nsp, 'spotify::code', async (token, cb) => {
      const waitForUsername = () => {
        return new Promise((resolve) => {
          const check = async () => {
            if (this.client) {
              this.client.getMe()
                .then((data) => {
                  this.username = data.body.display_name ? data.body.display_name : data.body.id;
                  resolve(true);
                }, () => {
                  global.setTimeout(() => {
                    check();
                  }, 1000);
                });
            } else {
              resolve(true);
            }
          };
          check();
        });
      };

      this.currentSong = JSON.stringify({});
      this.isUnauthorized = false;
      this.connect({ token });
      await waitForUsername();
      cb(null, true);
    });
    adminEndpoint(this.nsp, 'spotify::revoke', async (cb) => {
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
        this.currentSong = JSON.stringify({});

        info(chalk.yellow('SPOTIFY: ') + `Access to account ${username} is revoked`);

        cb(null, { do: 'refresh' });
      } catch (e) {
        cb(e.stack);
      } finally {
        this.timeouts.IRefreshToken = global.setTimeout(() => this.IRefreshToken(), 60000);
      }
    });
    adminEndpoint(this.nsp, 'spotify::authorize', async (cb) => {
      if (
        this.clientId === ''
        || this.clientSecret === ''
      ) {
        cb('Cannot authorize! Missing clientId or clientSecret.', null);
      } else {
        try {
          const authorizeURI = this.authorizeURI();
          if (!authorizeURI) {
            error('Integration must be enabled to authorize');
            cb('Integration must enabled to authorize');
          } else {
            cb(null, { do: 'redirect', opts: [authorizeURI] });
          }
        } catch (e) {
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

      if (this._accessToken && this._refreshToken) {
        this.client.setAccessToken(this._accessToken);
        this.client.setRefreshToken(this._refreshToken);
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
      } catch (e) {
        error(e.stack);
        addUIError({ name: 'SPOTIFY', message: 'Client connection failed.' });
        info(chalk.yellow('SPOTIFY: ') + 'Client connection failed');
      }
    } catch (e) {
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
      const songToUnban = await getRepository(SpotifySongBan).findOneOrFail({ where: { spotifyUri: opts.parameters } });
      await getRepository(SpotifySongBan).delete({ spotifyUri: opts.parameters });
      return [{
        response: prepare('integrations.spotify.song-unbanned', {
          artist: songToUnban.artists[0], uri: songToUnban.spotifyUri, name: songToUnban.title,
        }), ...opts,
      }];
    } catch (e) {
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
      await getRepository(SpotifySongBan).save({
        artists: currentSong.artists.split(', '), spotifyUri: currentSong.uri, title: currentSong.song,
      });
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
        const response = await this.client.getTrack(id);
        ioServer?.emit('api.stats', {
          method: 'GET', data: response.body, timestamp: Date.now(), call: 'spotify::search', api: 'other', endpoint: 'n/a', code: response.statusCode,
        });

        const track = response.body;
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
        const response = await this.client.searchTracks(spotifyId);
        ioServer?.emit('api.stats', {
          method: 'GET', data: response.body, timestamp: Date.now(), call: 'spotify::search', api: 'other', endpoint: 'n/a', code: response.statusCode,
        });

        if (!response.body.tracks || response.body.tracks.items.length === 0) {
          throw new Error('Song not found');
        }

        const track =  response.body.tracks.items[0]; //(response.body.tracks.items[0] as SpotifyTrack);
        if(await this.requestSongByAPI(track.uri)) {
          return [{ response: prepare('integrations.spotify.song-requested', { name: track.name, artist: track.artists[0].name }), ...opts }];
        } else {
          return [{ response: prepare('integrations.spotify.cannot-request-song-is-banned', { name: track.name, artist: track.artists[0].name }), ...opts }];
        }
      }
    } catch (e) {
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
        const isSongBanned = (await getRepository(SpotifySongBan).count({ where: { spotifyUri: uri } })) > 0;
        if (isSongBanned) {
          return false;
        }

        const queueResponse = await this.client.addToQueue(uri);
        ioServer?.emit('api.stats', {
          method: 'POST', data: queueResponse.body, timestamp: Date.now(), call: 'spotify::queue', api: 'other', endpoint: 'https://api.spotify.com/v1/me/player/queue?uri=' + uri, code: queueResponse.statusCode,
        });
        return true;
      } catch (e) {
        if (e.stack.includes('WebapiPlayerError')) {
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

_spotify = new Spotify();
export default _spotify;