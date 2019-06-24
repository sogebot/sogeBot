import { YouTube } from 'better-youtube-api';
import * as _ from 'lodash';
import { isMainThread } from 'worker_threads';
import ytsearch from 'youtube-search';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';

import { prepare, sendMessage, timeout } from '../commons';
import { command, default_permission, settings, shared, ui } from '../decorators';
import { permission } from '../permissions';
import System from './_interface';
import { onChange } from '../decorators/on';

class Songs extends System {
  youtubeApi = new YouTube('AIzaSyDYevtuLOxbyqBjh17JNZNvSQO854sngK0');

  @shared()
  meanLoudness: number = -15;
  @shared()
  currentSong: string = JSON.stringify({ videoID: null });

  @settings()
  @ui({
    type: 'number-input',
    step: '1',
    min: '0',
    max: '100'
  })
  volume: number = 25;
  @settings()
  duration: number = 10;
  @settings()
  shuffle: boolean = true;
  @settings()
  songrequest: boolean = true;
  @settings()
  playlist: boolean = true;
  @settings()
  notify: boolean = false;
  @settings()
  onlyMusicCategory: boolean = false;
  @settings()
  calculateVolumeByLoudness: boolean = true;

  constructor () {
    super();

    if (isMainThread) {
      this.getMeanLoudness();

      this.addMenu({ category: 'manage', name: 'playlist', id: 'songs/playlist' });
      this.addMenu({ category: 'manage', name: 'bannedsongs', id: 'songs/bannedsongs' });
      this.addWidget('ytplayer', 'widget-title-ytplayer', 'fas fa-headphones');
    }
  }

  sockets () {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }

    this.socket.on('connection', (socket) => {
      socket.on('find.ban', async (where, cb) => {
        where = where || {};
        cb(null, await global.db.engine.find(this.collection.ban, where));
      });
      socket.on('find.playlist', async (where, cb) => {
        where = where || {};
        let playlist = await global.db.engine.find(this.collection.playlist, where);
        for (let i of playlist) {
          i.volume = await this.getVolume(i);
          i.forceVolume = i.forceVolume || false;
        }
        cb(null, playlist);
      });
      socket.on('find.request', async (where, cb) => {
        where = where || {};
        cb(null, _.orderBy(await global.db.engine.find(this.collection.request, where)), ['addedAt'], ['asc']);
      });
      socket.on('delete.playlist', async (_id, cb) => {
        await global.db.engine.remove(this.collection.playlist, { _id });
        cb();
      });
      socket.on('delete.ban', async (_id, cb) => {
        await global.db.engine.remove(this.collection.ban, { _id });
        cb();
      });
      socket.on('import.ban', async (url, cb) => {
        cb(null, await this.banSongById({ parameters: this.getIdFromURL(url), sender: null }));
      });
      socket.on('import.playlist', async (playlist, cb) => {
        cb(null, await this.importPlaylist({ parameters: playlist, sender: null }));
      });
      socket.on('import.video', async (url, cb) => {
        cb(null, await this.addSongToPlaylist({ parameters: url, sender: null }));
      });
      socket.on('next', async () => {
        this.sendNextSongID();
      });
    });
  }

  getIdFromURL (url) {
    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    var match = url.match(urlRegex);
    var videoID = (match && match[1].length === 11) ? match[1] : url;
    return videoID;
  }

  async getMeanLoudness () {
    let playlist = await global.db.engine.find(this.collection.playlist);
    if (_.isEmpty(playlist)) {
      this.meanLoudness = -15;
      return -15;
    }

    var loudness = 0;
    for (let item of playlist) {
      if (_.isNil(item.loudness)) {
        loudness = loudness + -15;
      } else {
        loudness = loudness + parseFloat(item.loudness);
      }
    }
    this.meanLoudness = loudness / playlist.length;
    return loudness / playlist.length;
  }

  async getVolume (item) {
    if (!item.forceVolume && this.calculateVolumeByLoudness) {
      item.loudness = !_.isNil(item.loudness) ? item.loudness : -15;
      const volume = this.volume;
      var correction = Math.ceil((volume / 100) * 3);
      var loudnessDiff = this.meanLoudness - item.loudness;
      return Math.round(volume + (correction * loudnessDiff));
    } else {
      return item.volume;
    }
  }

  async getCurrentVolume (socket) {
    let volume = 0;
    if (this.calculateVolumeByLoudness) {
      volume = await this.getVolume(JSON.parse(this.currentSong));
    } else {
      volume = this.volume;
    }
    socket.emit('newVolume', volume);
  }

  setTrim (socket, data) {
    global.db.engine.update(this.collection.playlist, { videoID: data.id }, { startTime: data.lowValue, endTime: data.highValue });
  }

  @command('!bansong')
  @default_permission(permission.CASTERS)
  banSong (opts) {
    opts.parameters.trim().length === 0 ? this.banCurrentSong(opts) : this.banSongById(opts);
  }

  async banCurrentSong (opts) {
    let currentSong = JSON.parse(this.currentSong);
    if (_.isNil(currentSong.videoID)) {
      return;
    }

    let update = await global.db.engine.update(this.collection.ban, { videoId: currentSong.videoID }, { videoId: currentSong.videoID, title: currentSong.title });
    if (update.length > 0) {
      let message = await prepare('songs.song-was-banned', { name: currentSong.title });
      sendMessage(message, opts.sender, opts.attr);

      // send timeouts to all users who requested song
      const request = (await global.db.engine.find(this.collection.request, { videoID: opts.parameters })).map(o => o.username);
      if (currentSong.videoID === opts.parameters) {
        request.push(currentSong.username);
      }
      for (let user of request) {
        timeout(user, global.translate('songs.song-was-banned-timeout-message'), 300);
      }

      await Promise.all([global.db.engine.remove(this.collection.playlist, { videoID: currentSong.videoID }), global.db.engine.remove(this.collection.request, { videoID: currentSong.videoID })]);

      this.getMeanLoudness();
      this.sendNextSongID();
      this.refreshPlaylistVolume();
    }
  }

  @onChange('calculateVolumeByLoudness')
  async refreshPlaylistVolume () {
    let playlist = await global.db.engine.find(this.collection.playlist);
    for (let item of playlist) {
      if (_.isNil(item.loudness)) {
        await global.db.engine.update(this.collection.playlist, { _id: String(item._id) }, { loudness: -15 });
      }
      item.volume = await this.getVolume(item);
    }
  }

  async banSongById (opts) {
    let banned = 0;
    const waitForBan = () => {
      return new Promise((resolve, reject) => {
        const ban = (resolve) => {
          ytdl.getInfo('https://www.youtube.com/watch?v=' + opts.parameters, async (err, videoInfo) => {
            if (err) {
              global.log.error(err, { fnc: 'Songs.prototype.banSongById#1' });
            } else if (!_.isNil(videoInfo) && !_.isNil(videoInfo.title)) {
              banned++;
              sendMessage(global.translate('songs.bannedSong').replace(/\$title/g, videoInfo.title), opts.sender, opts.attr);

              // send timeouts to all users who requested song
              const request = (await global.db.engine.find(this.collection.request, { videoID: opts.parameters })).map(o => o.username);
              const currentSong = JSON.parse(this.currentSong);
              if (currentSong.videoID === opts.parameters) {
                request.push(currentSong.username);
              }
              for (let user of request) {
                timeout(user, global.translate('songs.bannedSongTimeout'), 300);
              }

              await Promise.all([
                global.db.engine.update(this.collection.ban, { videoId: opts.parameters }, { videoId: opts.parameters, title: videoInfo.title }),
                global.db.engine.remove(this.collection.playlist, { videoID: opts.parameters }),
                global.db.engine.remove(this.collection.request, { videoID: opts.parameters })
              ]);
            };
            resolve();
          });
        };
        ban(resolve);
      });
    };
    await waitForBan();
    this.getMeanLoudness();
    this.refreshPlaylistVolume();

    const currentSong = JSON.parse(this.currentSong);
    if (currentSong.videoID === opts.parameters) {
      this.sendNextSongID(); // skip song if its currently playing
    }
    return { banned };
  }

  @command('!unbansong')
  @default_permission(permission.CASTERS)
  async unbanSong (opts) {
    let removed = await global.db.engine.remove(this.collection.ban, { videoId: opts.parameters });
    if (removed > 0) {
      sendMessage(global.translate('songs.song-was-unbanned'), opts.sender, opts.attr);
    } else {
      sendMessage(global.translate('songs.song-was-not-banned'), opts.sender, opts.attr);
    }
  }

  @command('!skipsong')
  @default_permission(permission.CASTERS)
  async sendNextSongID () {
    if (!isMainThread) {
      return global.workers.sendToMaster({ type: 'call', ns: 'systems.songs', fnc: 'sendNextSongID' });
    }

    // check if there are any requests
    if (this.songrequest) {
      let sr = await global.db.engine.find(this.collection.request);
      sr = _.head(_.orderBy(sr, ['addedAt'], ['asc']));
      if (!_.isNil(sr)) {
        let currentSong = sr;
        currentSong.volume = await this.getVolume(currentSong);
        currentSong.type = 'songrequests';
        this.currentSong = JSON.stringify(currentSong);

        if (this.notify) {this.notifySong();}
        if (this.socket) {
          this.socket.emit('videoID', currentSong);
        }
        await global.db.engine.remove(this.collection.request, { videoID: sr.videoID });
        return;
      }
    }

    // get song from playlist
    if (this.playlist) {
      let pl = await global.db.engine.find(this.collection.playlist);
      if (_.isEmpty(pl)) {
        if (this.socket) {
          this.socket.emit('videoID', null); // send null and skip to next empty song
        }
        return; // don't do anything if no songs in playlist
      }
      pl = _.head(_.orderBy(pl, [(this.shuffle ? 'seed' : 'lastPlayedAt')], ['asc']));

      // shuffled song is played again
      if (this.shuffle && pl.seed === 1) {
        await this.createRandomSeeds();
        this.sendNextSongID(); // retry with new seeds
        return;
      }

      await global.db.engine.update(this.collection.playlist, { _id: pl._id.toString() }, { seed: 1, lastPlayedAt: new Date().getTime() });
      let currentSong = pl;
      currentSong.volume = await this.getVolume(currentSong);
      currentSong.type = 'playlist';
      this.currentSong = JSON.stringify(currentSong);

      if (this.notify) {this.notifySong();}

      if (this.socket) {
        this.socket.emit('videoID', currentSong);
      }
      return;
    }

    // nothing to send
    if (this.socket) {
      this.socket.emit('videoID', null);
    }
  }

  @command('!currentsong')
  async getCurrentSong () {
    let translation = 'songs.no-song-is-currently-playing';
    const currentSong = JSON.parse(this.currentSong);
    if (!_.isNil(currentSong.title)) {
      if (currentSong.type === 'playlist') {translation = 'songs.current-song-from-playlist';}
      else {translation = 'songs.current-song-from-songrequest';}
    }
    let message = await prepare(translation, { name: currentSong.title, username: currentSong.username });
    const userObj = await global.users.getByName(global.oauth.broadcasterUsername);
    sendMessage(message, {
      username: userObj.username,
      displayName: userObj.displayName || userObj.username,
      userId: userObj.id,
      emotes: [],
      badges: {},
      'message-type': 'chat'
    });
  }

  async notifySong () {
    var translation;
    const currentSong = JSON.parse(this.currentSong);
    if (!_.isNil(currentSong.title)) {
      if (currentSong.type === 'playlist') {translation = 'songs.current-song-from-playlist';}
      else {translation = 'songs.current-song-from-songrequest';}
    } else {return;}
    let message = await prepare(translation, { name: currentSong.title, username: currentSong.username });
    const userObj = await global.users.getByName(global.oauth.broadcasterUsername);
    sendMessage(message, {
      username: userObj.username,
      displayName: userObj.displayName || userObj.username,
      userId: userObj.id,
      emotes: [],
      badges: {},
      'message-type': 'chat'
    });
  }

  @command('!playlist steal')
  @default_permission(permission.CASTERS)
  async stealSong () {
    try {
      const currentSong = JSON.parse(this.currentSong);
      this.addSongToPlaylist({ sender: null, parameters: currentSong.videoID });
    } catch (err) {
      const userObj = await global.users.getByName(global.oauth.broadcasterUsername);
      sendMessage(global.translate('songs.noCurrentSong'), {
        username: userObj.username,
        displayName: userObj.displayName || userObj.username,
        userId: userObj.id,
        emotes: [],
        badges: {},
        'message-type': 'chat'
      });
    }
  }

  async createRandomSeeds () {
    let playlist = await global.db.engine.find(this.collection.playlist);
    for (let item of playlist) {
      global.db.engine.update(this.collection.playlist, { _id: item._id.toString() }, { seed: Math.random() });
    }
  }

  @command('!playlist')
  @default_permission(permission.CASTERS)
  async help () {
    const userObj = await global.users.getByName(global.oauth.broadcasterUsername);
    sendMessage(global.translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal', {
      username: userObj.username,
      displayName: userObj.displayName || userObj.username,
      userId: userObj.id,
      emotes: [],
      badges: {},
      'message-type': 'chat'
    });
  }

  @command('!songrequest')
  async addSongToQueue (opts) {
    if (opts.parameters.length < 1 || !this.songrequest) {
      if (this.songrequest) {
        sendMessage(global.translate('core.usage') + ': !songrequest <video-id|video-url|search-string>', opts.sender, opts.attr);
      } else {
        sendMessage('$sender, ' + global.translate('core.settings.songs.songrequest.false'), opts.sender, opts.attr);
      }
      return;
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const idRegex = /^[a-zA-Z0-9-_]{11}$/;
    var match = opts.parameters.match(urlRegex);
    var videoID = (match && match[1].length === 11) ? match[1] : opts.parameters;

    if (_.isNil(videoID.match(idRegex))) { // not id or url
      ytsearch(opts.parameters, { maxResults: 1, key: 'AIzaSyDYevtuLOxbyqBjh17JNZNvSQO854sngK0' }, (err, results) => {
        if (err) {return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#3' });}
        if (typeof results !== 'undefined' && results[0].id) {
          opts.parameters = results[0].id;
          this.addSongToQueue(opts);
        }
      });
      return;
    }

    // is song banned?
    let ban = await global.db.engine.findOne(this.collection.ban, { videoID: videoID });
    if (!_.isEmpty(ban)) {
      sendMessage(global.translate('songs.song-is-banned'), opts.sender, opts.attr);
      return;
    }

    // is correct category?
    if (this.onlyMusicCategory) {
      try {
        const video = await this.youtubeApi.getVideo(videoID);
        if (video.data.snippet.categoryId !== '10') {
          return sendMessage(global.translate('songs.incorrect-category'), opts.sender, opts.attr);
        }
      } catch (e) {}
    }

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async (err, videoInfo) => {
      if (err) {return global.log.error(err, { fnc: 'Songs.prototype.addSongToQueue#1' });}
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        sendMessage(global.translate('songs.song-was-not-found'), opts.sender, opts.attr);
      } else if (Number(videoInfo.length_seconds) / 60 > this.duration) {
        sendMessage(global.translate('songs.song-is-too-long'), opts.sender, opts.attr);
      } else {
        global.db.engine.update(this.collection.request, { addedAt: new Date().getTime() }, { videoID: videoID, title: videoInfo.title, addedAt: new Date().getTime(), loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, username: opts.sender.username });
        let message = await prepare('songs.song-was-added-to-queue', { name: videoInfo.title });
        sendMessage(message, opts.sender, opts.attr);
        this.getMeanLoudness();
      }
    });
  }

  @command('!wrongsong')
  async removeSongFromQueue (opts) {
    let sr = await global.db.engine.find(this.collection.request, { username: opts.sender.username });
    sr = _.head(_.orderBy(sr, ['addedAt'], ['desc']));
    if (!_.isNil(sr)) {
      await global.db.engine.remove(this.collection.request, { username: opts.sender.username, _id: sr._id.toString() });
      let m = await prepare('songs.song-was-removed-from-queue', { name: sr.title });
      sendMessage(m, opts.sender, opts.attr);
      this.getMeanLoudness();
    }
  }

  @command('!playlist add')
  @default_permission(permission.CASTERS)
  async addSongToPlaylist (opts) {
    if (_.isNil(opts.parameters)) {return;}

    var urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    var match = opts.parameters.match(urlRegex);
    var id = (match && match[1].length === 11) ? match[1] : opts.parameters;

    let imported = 0;
    let done = 0;

    let idsFromDB = (await global.db.engine.find(this.collection.playlist)).map(o => o.videoID);
    let banFromDb = (await global.db.engine.find(this.collection.ban)).map(o => o.videoID);

    if (idsFromDB.includes(id)) {
      global.log.info(`=> Skipped ${id} - Already in playlist`);
      done++;
    } else if (banFromDb.includes(id)) {
      global.log.info(`=> Skipped ${id} - Song is banned`);
      done++;
    } else {
      ytdl.getInfo('https://www.youtube.com/watch?v=' + id, async (err, videoInfo) => {
        done++;
        if (err) {return global.log.error(`=> Skipped ${id} - ${err.message}`);}
        else if (!_.isNil(videoInfo) && !_.isNil(videoInfo.title)) {
          global.log.info(`=> Imported ${id} - ${videoInfo.title}`);
          global.db.engine.update(this.collection.playlist, { videoID: id }, { videoID: id, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime(), seed: 1 });
          imported++;
        }
      });
    }

    const waitForImport = function () {
      return new Promise((resolve) => {
        const check = (resolve) => {
          if (done === 1) {resolve();}
          else {setTimeout(() => check(resolve), 500);}
        };
        check(resolve);
      });
    };

    await waitForImport();

    this.refreshPlaylistVolume();
    this.getMeanLoudness();
    sendMessage(await prepare('songs.playlist-imported', { imported, skipped: done - imported }), opts.sender, opts.attr);
    return { imported, skipped: done - imported };
  }

  @command('!playlist remove')
  @default_permission(permission.CASTERS)
  async removeSongFromPlaylist (opts) {
    if (opts.parameters.length < 1) {return;}
    var videoID = opts.parameters;

    let song = await global.db.engine.findOne(this.collection.playlist, { videoID: videoID });
    if (!_.isEmpty(song)) {
      await global.db.engine.remove(this.collection.playlist, { videoID: videoID });
      let message = await prepare('songs.song-was-removed-from-playlist', { name: song.title });
      sendMessage(message, opts.sender, opts.attr);
    } else {
      sendMessage(global.translate('songs.song-was-not-found'), opts.sender, opts.attr);
    }
  }

  async getSongsIdsFromPlaylist (playlist) {
    const get = function ():  Promise<{ items: any[] }> {
      return new Promise((resolve, reject): any => {
        ytpl(playlist, { limit: Number.MAX_SAFE_INTEGER }, function (err, playlist: { items: any[] }) {
          if (err) {reject(err);}
          resolve(playlist);
        });
      });
    };
    let data = await get();
    return data.items.map(o => o.id);
  }

  @command('!playlist import')
  @default_permission(permission.CASTERS)
  async importPlaylist (opts) {
    if (opts.parameters.length < 1) {
      return;
    }
    const ids = await global.systems.songs.getSongsIdsFromPlaylist(opts.parameters);

    if (ids.length === 0) {
      sendMessage(await prepare('songs.playlist-is-empty'), opts.sender, opts.attr);
    } else {
      let imported = 0;
      let done = 0;

      let idsFromDB = (await global.db.engine.find(this.collection.playlist)).map(o => o.videoID);
      let banFromDb = (await global.db.engine.find(this.collection.ban)).map(o => o.videoID);

      for (let id of ids) {
        if (idsFromDB.includes(id)) {
          global.log.info(`=> Skipped ${id} - Already in playlist`);
          done++;
        } else if (banFromDb.includes(id)) {
          global.log.info(`=> Skipped ${id} - Song is banned`);
          done++;
        } else {
          ytdl.getInfo('https://www.youtube.com/watch?v=' + id, async (err, videoInfo) => {
            done++;
            if (err) {
              return global.log.error(`=> Skipped ${id} - ${err.message}`);
            } else if (!_.isNil(videoInfo) && !_.isNil(videoInfo.title)) {
              global.log.info(`=> Imported ${id} - ${videoInfo.title}`);
              global.db.engine.update(this.collection.playlist, { videoID: id }, { videoID: id, title: videoInfo.title, loudness: videoInfo.loudness, length_seconds: videoInfo.length_seconds, lastPlayedAt: new Date().getTime(), seed: 1 });
              imported++;
            }
          });
        }
      }

      const waitForImport = function () {
        return new Promise((resolve) => {
          const check = (resolve) => {
            if (done === ids.length) {resolve();}
            else {setTimeout(() => check(resolve), 500);}
          };
          check(resolve);
        });
      };

      await waitForImport();

      await this.refreshPlaylistVolume();
      await this.getMeanLoudness();
      sendMessage(await prepare('songs.playlist-imported', { imported, skipped: done - imported }), opts.sender, opts.attr);
      return { imported, skipped: done - imported };
    }
  }
}

export default Songs;
export { Songs };
