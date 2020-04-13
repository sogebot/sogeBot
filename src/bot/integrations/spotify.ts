import axios from 'axios';
import chalk from 'chalk';
import crypto from 'crypto';
import _ from 'lodash';
import SpotifyWebApi from 'spotify-web-api-node';
import { isMainThread } from '../cluster';

import { prepare } from '../commons';
import { command, default_permission, settings, shared, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import Expects from '../expects';
import Integration from './_interface';
import { debug, error, info, warning } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import api from '../api';
import { addUIError } from '../panel';
import { HOUR } from '../constants';

/*
 * How to integrate:
 * 1. Create app in https://beta.developer.spotify.com/dashboard/applications
 * 1a. Set redirect URI as http://whereYouAccessDashboard.com/oauth/spotify
 * 2. Update your clientId, clientSecret, redirectURI in Integrations UI
 * 3. Authorize your user through UI
 */

let _spotify: any = null;

class Spotify extends Integration {
  client: null | SpotifyWebApi = null;
  retry: { IRefreshToken: number } = { IRefreshToken: 0 };
  uris: {
    uri: string;
    requestBy: string;
    artist: string;
    artists: string;
    song: string;
  }[] = [];
  currentUris: string | null = null;
  originalUri: string | null = null;
  skipToNextSong = false;
  state: any = null;
  @shared()
  userId: string | null = null;
  @shared()
  currentSong: string = JSON.stringify({});

  @settings()
  _accessToken: string | null = null;
  @settings()
  _refreshToken: string | null = null;
  @settings()
  songRequests = true;
  @settings()
  fetchCurrentSongWhenOffline = false;

  @settings('output')
  format = '$song - $artist';
  @settings('output')
  playlistToPlay = '';
  @settings('output')
  continueOnPlaylistAfterRequest = true;

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
    type: 'btn-emit',
    class: 'btn btn-primary btn-block mt-1 mb-1',
    if: () => _spotify.username.length === 0,
    emit: 'authorize',
  }, 'connection')
  authorizeBtn = null;

  @ui({
    type: 'btn-emit',
    class: 'btn btn-primary btn-block mt-1 mb-1',
    if: () => _spotify.username.length > 0,
    emit: 'revoke',
  }, 'connection')
  revokeBtn = null;

  constructor () {
    super();

    this.addWidget('spotify', 'widget-title-spotify', 'fab fa-spotify');

    if (isMainThread) {
      this.timeouts.IRefreshToken = global.setTimeout(() => this.IRefreshToken(), 60000);
      this.timeouts.ICurrentSong = global.setTimeout(() => this.ICurrentSong(), 10000);
      this.timeouts.getMe = global.setTimeout(() => this.getMe(), 10000);
      setInterval(() => this.sendSongs(), 500);
    }
  }

  @onChange('connection.username')
  onUsernameChange (key: string, value: string) {
    if (value.length > 0) {
      info(chalk.yellow('SPOTIFY: ') + `Access to account ${value} granted`);
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

  @command('!spotify skip')
  @default_permission(null)
  cSkipSong() {
    this.skipToNextSong = true;
  }

  async playNextSongFromRequest() {
    try {
      if (!this.client) {
        throw new Error('you are not connected to spotify API, authorize your user.');
      }

      const uri =  this.uris.shift();
      if (typeof uri === 'undefined') {
        throw new Error('URIs are empty');
      }
      this.currentUris = uri.uri; // FIFO
      await axios({
        method: 'put',
        url: 'https://api.spotify.com/v1/me/player/play',
        headers: {
          'Authorization': 'Bearer ' + this.client.getAccessToken(),
          'Content-Type': 'application/json',
        },
        data: {
          uris: [this.currentUris],
        },
      });

      // force is_playing and uri just to not skip until track refresh
      const song = JSON.parse(this.currentSong);
      song.uri = this.currentUris;
      song.is_playing = true;
      this.currentSong = JSON.stringify(song);
    } catch (e) {
      error(e.stack);
    }
  }

  async playNextSongFromPlaylist(retries = 0) {
    try {
      if (!this.client) {
        throw new Error('you are not connected to spotify API, authorize your user.');
      }
      // play from playlist
      const offset = this.originalUri ? { uri: this.originalUri } : undefined;
      await axios({
        method: 'put',
        url: 'https://api.spotify.com/v1/me/player/play',
        headers: {
          'Authorization': 'Bearer ' + this.client.getAccessToken(),
          'Content-Type': 'application/json',
        },
        data: {
          context_uri: this.playlistToPlay,
          offset,
        },
      });
      // skip to next song in playlist
      await axios({
        method: 'post',
        url: 'https://api.spotify.com/v1/me/player/next',
        headers: {
          'Authorization': 'Bearer ' + this.client.getAccessToken(),
        },
      });
      this.currentUris = null;
    } catch (e) {
      if (this.originalUri) {
        warning('Cannot continue playlist from ' + String(this.originalUri));
        warning('Playlist will continue from random track');
      } else {
        if (retries < 5) {
          warning(`Cannot continue playlist from random song. Retry ${retries + 1} of 5 in 5 seconds.`);
          setTimeout(() => {
            this.playNextSongFromPlaylist(retries++);
          }, 5000);
        } else {
          warning(`Cannot continue playlist from random song. Retries limit reached.`);
          error(e.stack);
        }
      }
      this.originalUri = null;
    }
  }

  async sendSongs () {
    if (!this.userId || !(this.enabled)) {
      return;
    }

    const song = JSON.parse(this.currentSong);

    debug('spotify.request', {
      song,
      originalUri: this.originalUri,
      cachedRequests: this.currentUris,
      requests: this.uris,
    });

    // if song is not part of currentUris => save context
    if (typeof song.uri !== 'undefined' && this.currentUris !== song.uri && this.uris.length === 0) {
      this.originalUri = song.uri;
    }

    if (!(api.isStreamOnline)) {
      return; // don't do anything on offline stream
    }

    if (this.skipToNextSong) {
      if (song.is_playing) {
        if (this.uris.length > 0) {
          this.playNextSongFromRequest();
        } else {
          this.playNextSongFromPlaylist();
        }
      }
      this.skipToNextSong = false; // reset skip
      return;
    }

    // if song is part of currentUris and is playing, do nothing
    if (typeof song.uri !== 'undefined' && this.currentUris === song.uri && song.is_playing) {
      return;
    }

    // if song is part of currentUris and is not playing (finished playing), continue from playlist if set
    if (typeof song.uri !== 'undefined' && this.currentUris === song.uri && (!song.is_playing || song.force_skip) && this.uris.length === 0) {
      if (this.playlistToPlay.length > 0 && this.continueOnPlaylistAfterRequest) {
        this.playNextSongFromPlaylist();
      }
    } else if (this.uris.length > 0) { // or we have requests
      if (Date.now() - song.finished_at <= 0 || this.originalUri !== song.uri || this.originalUri === null || (!song.is_playing || song.force_skip)) { // song should be finished
        this.playNextSongFromRequest();
      }
    }
  }

  async getMe () {
    clearTimeout(this.timeouts.getMe);

    try {
      if ((this.enabled) && !_.isNil(this.client)) {
        const data = await this.client.getMe();
        this.userId = data.body.id;
        this.username = data.body.display_name ? data.body.display_name : data.body.id;
      }
    } catch (e) {
      if (e.message !== 'Unauthorized') {
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
      if (!this.fetchCurrentSongWhenOffline && !(api.isStreamOnline)) {
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
          finished_at: Date.now() - data.body.item.duration_ms, // may be off ~10s, but its important for requests
          song: data.body.item.name,
          artist: data.body.item.artists[0].name,
          artists: data.body.item.artists.map(o => o.name).join(', '),
          uri: data.body.item.uri,
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
          info(chalk.yellow('SPOTIFY: ') + 'Access token refreshed OK');
        }
      } catch (e) {
        this.retry.IRefreshToken++;
        info(chalk.yellow('SPOTIFY: ') + 'Refreshing access token failed ' + (this.retry.IRefreshToken > 0 ? 'retrying #' + this.retry.IRefreshToken : ''));
      }
    }

    if (this.retry.IRefreshToken >= 5) {
      addUIError({ name: 'SPOTIFY', message: 'Refreshing access token failed.' });
    }
    this.timeouts.IRefreshToken = global.setTimeout(() => this.IRefreshToken(), HOUR);
  }

  sockets () {
    adminEndpoint(this.nsp, 'state', async (callback) => {
      callback(null, this.state);
    });
    adminEndpoint(this.nsp, 'skip', async (callback) => {
      this.skipToNextSong = true;
      callback(null);
    });
    adminEndpoint(this.nsp, 'code', async (token, callback) => {
      const waitForUsername = () => {
        return new Promise((resolve, reject) => {
          const check = async () => {
            if (this.client) {
              this.client.getMe()
                .then((data) => {
                  this.username = data.body.display_name ? data.body.display_name : data.body.id;
                  resolve();
                }, () => {
                  global.setTimeout(() => {
                    check();
                  }, 1000);
                });
            } else {
              resolve();
            }
          };
          check();
        });
      };

      this.currentSong = JSON.stringify({});
      this.connect({ token });
      await waitForUsername();
      callback(null, true);
    });
    adminEndpoint(this.nsp, 'revoke', async (cb) => {
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
    adminEndpoint(this.nsp, 'authorize', async (cb) => {
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
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        redirectUri: this.redirectURI,
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

  @command('!spotify')
  @default_permission(null)
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    if (!(api.isStreamOnline)) {
      error(`${chalk.bgRed('SPOTIFY')}: stream is offline.`);
      return [];
    } // don't do anything on offline stream
    if (!this.songRequests) {
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
        const response = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/tracks/' + id,
          headers: {
            'Authorization': 'Bearer ' + this.client.getAccessToken(),
          },
        });
        const track = response.data;
        this.uris.push({
          uri: 'spotify:track:' + id,
          requestBy: opts.sender.username,
          song: track.name,
          artist: track.artists[0].name,
          artists: track.artists.map(o => o.name).join(', '),
        });
        return [{ response: prepare('integrations.spotify.song-requested', {
          name: track.name, artist: track.artists[0].name, artists: track.artists.map(o => o.name).join(', '),
        }), ...opts }];
      } else {
        const response = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/search?type=track&limit=1&q=' + encodeURI(spotifyId),
          headers: {
            'Authorization': 'Bearer ' + this.client.getAccessToken(),
            'Content-Type': 'application/json',
          },
        });
        const track = response.data.tracks.items[0];
        this.uris.push({
          uri: track.uri,
          requestBy: opts.sender.username,
          song: track.name,
          artist: track.artists[0].name,
          artists: track.artists.map(o => o.name).join(', '),
        });
        return [{ response: prepare('integrations.spotify.song-requested', {
          name: track.name, artist: track.artists[0].name,
        }), ...opts }];
      }
    } catch (e) {
      if (e.response.status === 401) {
        error(`${chalk.bgRed('SPOTIFY')}: you don't have access to spotify API, try to revoke and authorize again.`);
      }
      return [{ response: prepare('integrations.spotify.song-not-found'), ...opts }];
    }
  }
}

_spotify = new Spotify();
export default _spotify;