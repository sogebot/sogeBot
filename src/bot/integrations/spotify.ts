import axios from 'axios';
import chalk from 'chalk';
import crypto from 'crypto';
import _ from 'lodash';
import SpotifyWebApi from 'spotify-web-api-node';
import { isMainThread } from 'worker_threads';

import { prepare, sendMessage } from '../commons';
import { command, default_permission, settings, shared, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import Expects from '../expects';
import Integration from './_interface';

const __DEBUG__ = {
  REQUEST: (process.env.DEBUG && process.env.DEBUG.includes('spotify.request')) || (process.env.DEBUG && process.env.DEBUG.includes('spotify.*'))
};

/*
 * How to integrate:
 * 1. Create app in https://beta.developer.spotify.com/dashboard/applications
 * 1a. Set redirect URI as http://whereYouAccessDashboard.com/oauth/spotify
 * 2. Update your clientId, clientSecret, redirectURI in Integrations UI
 * 3. Authorize your user through UI
 */

class Spotify extends Integration {
  client: any = null;
  uris: {
    uri: string;
    requestBy: string;
    artist: string;
    song: string;
  }[] = [];
  currentUris: string | null = null;
  originalUri: string | null = null;
  skipToNextSong: boolean = false;
  state: any = null;
  @shared()
  userId: string | null = null;
  @shared()
  playlistId: string | null = null;
  @shared()
  currentSong: string = JSON.stringify({});

  @settings()
  _accessToken: string | null = null;
  @settings()
  _refreshToken: string | null = null;
  @settings()
  songRequests: boolean = true;
  @settings()
  fetchCurrentSongWhenOffline: boolean = false;

  @settings('output')
  format: string = '$song - $artist';
  @settings('output')
  playlistToPlay: string = '';
  @settings('output')
  continueOnPlaylistAfterRequest: boolean = true;

  @settings('connection')
  @ui({ type: 'text-input', secret: true })
  clientId: string = '';
  @settings('connection')
  @ui({ type: 'text-input', secret: true })
  clientSecret: string = '';
  @settings('connection')
  redirectURI: string = 'http://localhost:20000/oauth/spotify';
  @settings('connection')
  @ui({ type: 'text-input', readOnly: true })
  username: string = '';
  @settings('connection')
  @ui({ type: 'check-list', current: 'authenticatedScopes' })
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
  @settings('connection')
  @ui({ ignore: true })
  authenticatedScopes: string[] = [];

  @ui({
    type: 'button-socket',
    on: '/integrations/spotify',
    class: 'btn btn-primary btn-block',
    text: 'integrations.spotify.settings.authorize',
    if: () => global.integrations.spotify.username.length === 0,
    emit: 'authorize'
  }, 'connection')
  authorizeBtn: null = null;

  @ui({
    type: 'button-socket',
    on: '/integrations/spotify',
    if: () => global.integrations.spotify.username.length > 0,
    emit: 'revoke',
    class: 'btn btn-primary btn-block',
    text: 'integrations.spotify.settings.revoke'
  }, 'connection')
  revokeBtn: null = null;

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
    if (value.length > 0) {global.log.info(chalk.yellow('SPOTIFY: ') + `Access to account ${value} granted`);}
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
  cSkipSong(opts) {
    this.skipToNextSong = true;
  }

  async playNextSongFromRequest() {
    try {
      const uri =  this.uris.shift();
      if (typeof uri === 'undefined') {
        throw new Error('URIs are empty');
      }
      this.currentUris = uri.uri; // FIFO
      await axios({
        method: 'put',
        url: 'https://api.spotify.com/v1/me/player/play',
        headers: {
          'Authorization': 'Bearer ' + this._accessToken,
          'Content-Type': 'application/json'
        },
        data: {
          uris: [this.currentUris]
        }
      });

      // force is_playing and uri just to not skip until track refresh
      const song = JSON.parse(this.currentSong);
      song.uri = this.currentUris;
      song.is_playing = true;
      this.currentSong = JSON.stringify(song);
    } catch (e) {
      global.log.error(e.stack);
    }
  }

  async playNextSongFromPlaylist() {
    try {
      // play from playlist
      const offset = this.originalUri ? { uri: this.originalUri } : undefined;
      await axios({
        method: 'put',
        url: 'https://api.spotify.com/v1/me/player/play',
        headers: {
          'Authorization': 'Bearer ' + this._accessToken,
          'Content-Type': 'application/json'
        },
        data: {
          context_uri: this.playlistToPlay,
          offset
        }
      });
      // skip to next song in playlist
      await axios({
        method: 'post',
        url: 'https://api.spotify.com/v1/me/player/next',
        headers: {
          'Authorization': 'Bearer ' + this._accessToken
        }
      });
      this.currentUris = null;
    } catch (e) {
      global.log.warning('Cannot continue playlist from ' + String(this.originalUri));
      global.log.warning('Playlist will continue from random track');
      this.originalUri = null;
    } finally {

    }
  }

  async sendSongs () {
    if (!this.userId || !(await this.isEnabled())) {
      return;
    }

    const song = JSON.parse(this.currentSong);

    if (__DEBUG__.REQUEST) {
      global.log.debug({
        song,
        originalUri: this.originalUri,
        cachedRequests: this.currentUris,
        requests: this.uris
      });
    }

    // if song is not part of currentUris => save context
    if (typeof song.uri !== 'undefined' && this.currentUris !== song.uri && this.uris.length === 0) {
      this.originalUri = song.uri;
    }

    //if (!(await global.cache.isOnline())) return // don't do anything on offline stream

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
    clearTimeout(this.timeouts['getMe']);

    try {
      if ((await this.isEnabled()) && !_.isNil(this.client)) {
        let data = await this.client.getMe();
        this.userId = data.body.id;
        this.username = data.body.display_name ? data.body.display_name : data.body.id;
      }
    } catch (e) {
      if (e.message !== 'Unauthorized') {
        global.log.info(chalk.yellow('SPOTIFY: ') + 'Get of user failed, check your credentials');
      }
      this.username = '';
      this.userId = null;
    }

    this.timeouts['getMe'] = global.setTimeout(() => this.getMe(), 30000);
  }

  async ICurrentSong () {
    clearTimeout(this.timeouts['ICurrentSong']);

    try {
      if (!this.fetchCurrentSongWhenOffline && !(await global.cache.isOnline())) {throw Error('Stream is offline');}
      let data = await this.client.getMyCurrentPlayingTrack();

      let currentSong = JSON.parse(this.currentSong);
      if (typeof currentSong.song === 'undefined' || currentSong.song !== data.body.item.name) {
        currentSong = {
          finished_at: Date.now() - data.body.item.duration_ms, // may be off ~10s, but its important for requests
          song: data.body.item.name,
          artist: data.body.item.artists[0].name,
          uri: data.body.item.uri,
          is_playing: data.body.is_playing,
          is_enabled: await this.isEnabled()
        };
      }
      currentSong.is_playing = data.body.is_playing;
      currentSong.is_enabled = await this.isEnabled();
      this.currentSong = JSON.stringify(currentSong);
    } catch (e) {
      this.currentSong = JSON.stringify({});
    }
    this.timeouts['ICurrentSong'] = global.setTimeout(() => this.ICurrentSong(), 5000);
  }

  async IRefreshToken () {
    clearTimeout(this.timeouts['IRefreshToken']);

    try {
      if (!_.isNil(this.client) && this._refreshToken) {
        let data = await this.client.refreshAccessToken();
        this.client.setAccessToken(data.body['access_token']);
        this._accessToken = data.body['access_token'];
      }
    } catch (e) {
      global.log.info(chalk.yellow('SPOTIFY: ') + 'Refreshing access token failed');
    }
    this.timeouts['IRefreshToken'] = global.setTimeout(() => this.IRefreshToken(), 60000);
  }

  sockets () {
    const io = global.panel.io.of('/integrations/spotify');

    io.on('connection', (socket) => {
      socket.on('state', async (callback) => {
        callback(null, this.state);
      });
      socket.on('skip', async (callback) => {
        this.skipToNextSong = true;
        callback(null);
      });
      socket.on('code', async (token, callback) => {
        const waitForUsername = () => {
          return new Promise((resolve, reject) => {
            let check = async (resolve) => {
              this.client.getMe()
                .then((data) => {
                  this.username = data.body.display_name ? data.body.display_name : data.body.id;
                  resolve();
                }, () => {
                  global.setTimeout(() => {
                    check(resolve);
                  }, 1000);
                });
            };
            check(resolve);
          });
        };

        this.currentSong = JSON.stringify({});
        this.connect({ token });
        await waitForUsername();
        callback(null, true);
      });
      socket.on('revoke', async (cb) => {
        clearTimeout(this.timeouts['IRefreshToken']);

        const username = this.username;
        this.client.resetAccessToken();
        this.client.resetRefreshToken();
        this.userId = null;
        this._accessToken = null;
        this._refreshToken = null;
        this.authenticatedScopes = [];
        this.username = '';
        this.currentSong = JSON.stringify({});

        global.log.info(chalk.yellow('SPOTIFY: ') + `Access to account ${username} is revoked`);

        this.timeouts['IRefreshToken'] = global.setTimeout(() => this.IRefreshToken(), 60000);
        cb(null, { do: 'refresh' });
      });
      socket.on('authorize', async (cb) => {
        if (
          this.clientId === '' ||
          this.clientSecret === ''
        ) {
          cb('Cannot authorize! Missing clientId or clientSecret.', null);
        } else {
          try {
            const authorizeURI = this.authorizeURI();
            if (!authorizeURI) {
              cb('Integration must enabled to authorize');
            } else {
              cb(null, { do: 'redirect', opts: [authorizeURI] });
            }
          } catch (e) {
            global.log.error(e.stack);
            cb(e.stack, null);
          }
        }
      });
    });
  }

  connect (opts: { token?: string } = {}) {
    let isNewConnection = this.client === null;
    try {
      let error: string[] = [];
      if (this.clientId.trim().length === 0) {error.push('clientId');}
      if (this.clientSecret.trim().length === 0) {error.push('clientSecret');}
      if (this.redirectURI.trim().length === 0) {error.push('redirectURI');}
      if (error.length > 0) {throw new Error(error.join(', ') + ' missing');}

      this.client = new SpotifyWebApi({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        redirectUri: this.redirectURI
      });

      if (this._accessToken && this._refreshToken) {
        this.client.setAccessToken(this._accessToken);
        this.client.setRefreshToken(this._refreshToken);
      }

      try {
        if (opts.token && !_.isNil(this.client)) {
          this.client.authorizationCodeGrant(opts.token)
            .then((data) => {
              this.authenticatedScopes = data.body.scope.split(' ');
              this._accessToken = data.body['access_token'];
              this._refreshToken = data.body['refresh_token'];

              this.client.setAccessToken(this._accessToken);
              this.client.setRefreshToken(this._refreshToken);
            }, (err) => {
              if (err) {global.log.info(chalk.yellow('SPOTIFY: ') + 'Getting of accessToken and refreshToken failed');}
            });
        }
        if (isNewConnection) {global.log.info(chalk.yellow('SPOTIFY: ') + 'Client connected to service');}
      } catch (e) {
        global.log.error(e.stack);
        global.log.info(chalk.yellow('SPOTIFY: ') + 'Client connection failed');
      }
    } catch (e) {
      global.log.info(chalk.yellow('SPOTIFY: ') + e.message);
    }
  }

  disconnect () {
    this.client = null;
    global.log.info(chalk.yellow('SPOTIFY: ') + 'Client disconnected from service');
  }

  authorizeURI () {
    if (_.isNil(this.client)) {
      return null;
    }
    let state = crypto.createHash('md5').update(Math.random().toString()).digest('hex');
    this.state = state;
    return this.client.createAuthorizeURL(this.scopes, state);
  }

  @command('!spotify')
  @default_permission(null)
  async main (opts: CommandOptions) {
    if (!(await global.cache.isOnline())) {return;} // don't do anything on offline stream
    if (!isMainThread) {
      // we have client connected on master -> send process to master
      global.workers.sendToMaster({ type: 'call', ns: 'integrations.spotify', fnc: 'main', args: [opts] });
      return;
    }
    if (!this.songRequests) {return;}

    try {
      let [spotifyId] = new Expects(opts.parameters)
        .everything()
        .toArray();

      if (spotifyId.startsWith('spotify:') || spotifyId.startsWith('https://open.spotify.com/track/')) {
        let id = '';
        if (spotifyId.startsWith('spotify:')) {id = spotifyId.replace('spotify:track:', '');}
        else {
          const regex = new RegExp('\\S+open\\.spotify\\.com\\/track\\/(\\w+)(.*)?', 'gi');
          const exec = regex.exec(spotifyId);
          if (exec) {id = exec[1];}
          else {throw Error('ID was not found in ' + spotifyId);}
        }
        let response = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/tracks/' + id,
          headers: {
            'Authorization': 'Bearer ' + this._accessToken
          }
        });
        let track = response.data;
        sendMessage(
          prepare('integrations.spotify.song-requested', {
            name: track.name, artist: track.artists[0].name
          }), opts.sender);
        this.uris.push({
          uri: 'spotify:track:' + id,
          requestBy: opts.sender.username,
          song: track.name,
          artist: track.artists[0].name,
        });
      } else {
        let response = await axios({
          method: 'get',
          url: 'https://api.spotify.com/v1/search?type=track&limit=1&q=' + encodeURI(spotifyId),
          headers: {
            'Authorization': 'Bearer ' + this._accessToken,
            'Content-Type': 'application/json'
          }
        });
        let track = response.data.tracks.items[0];
        sendMessage(
          prepare('integrations.spotify.song-requested', {
            name: track.name, artist: track.artists[0].name
          }), opts.sender);
        this.uris.push({
          uri: track.uri,
          requestBy: opts.sender.username,
          song: track.name,
          artist: track.artists[0].name,
        });
      }
    } catch (e) {
      sendMessage(
        prepare('integrations.spotify.song-not-found'), opts.sender);
    }
  }
}

export default Spotify;
export { Spotify };