import { YouTube } from 'better-youtube-api';
import * as _ from 'lodash';
import { isMainThread } from '../cluster';
import { setInterval } from 'timers';
import ytsearch from 'youtube-search';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';

import { getBot, prepare, sendMessage, timeout } from '../commons';
import { command, default_permission, settings, shared, ui } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { onChange, onLoad } from '../decorators/on';
import { error, info } from '../helpers/log';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { Brackets, getConnection, getRepository } from 'typeorm';
import { SongBan, SongPlaylist, SongPlaylistInterface, SongRequest } from '../database/entity/song';
import oauth from '../oauth';
import { translate } from '../translate';

const defaultApiKey = 'AIzaSyDYevtuLOxbyqBjh17JNZNvSQO854sngK0';

class Songs extends System {
  interval: { [id: string]: NodeJS.Timeout } = {};

  youtubeApi: any = null;

  @shared()
  meanLoudness = -15;
  @shared()
  currentSong: string = JSON.stringify({ videoID: null });
  @shared()
  isPlaying: {[socketId: string]: boolean } = {};

  @settings()
  @ui({ type: 'text-input', secret: true })
  apiKey = '';
  @settings()
  @ui({
    type: 'number-input',
    step: '1',
    min: '0',
    max: '100',
  })
  volume = 25;
  @settings()
  duration = 10;
  @settings()
  shuffle = true;
  @settings()
  songrequest = true;
  @settings()
  playlist = true;
  @settings()
  notify = false;
  @settings()
  onlyMusicCategory = false;
  @settings()
  calculateVolumeByLoudness = true;

  constructor () {
    super();

    if (isMainThread) {
      setTimeout(() => {
        this.getMeanLoudness();

        this.addMenu({ category: 'manage', name: 'playlist', id: 'manage/songs/playlist' });
        this.addMenu({ category: 'manage', name: 'bannedsongs', id: 'manage/songs/bannedsongs' });
        this.addWidget('ytplayer', 'widget-title-ytplayer', 'fas fa-headphones');
      }, 10000);
    }
  }

  @onChange('apiKey')
  @onLoad('apiKey')
  initYoutubeApi() {
    if (this.apiKey.trim().length > 0) {
      this.youtubeApi = new YouTube(this.apiKey);
    } else {
      this.youtubeApi = new YouTube(defaultApiKey);
    }
  }

  sockets () {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
    publicEndpoint(this.nsp, 'find.playlist', async (opts: { page?: number; search?: string }, cb) => {
      const connection = await getConnection();
      opts.page = opts.page ?? 0;
      const query = getRepository(SongPlaylist).createQueryBuilder('playlist')
        .offset(opts.page * 25)
        .limit(25);

      if (typeof opts.search !== 'undefined') {
        query.andWhere(new Brackets(w => {
          if  (['postgres'].includes(connection.options.type.toLowerCase())) {
            w.where('"playlist"."videoId" like :like', { like: `%${opts.search}%` });
            w.orWhere('"playlist"."title" like :like', { like: `%${opts.search}%` });
          } else {
            w.where('playlist.videoId like :like', { like: `%${opts.search}%` });
            w.orWhere('playlist.title like :like', { like: `%${opts.search}%` });
          }

        }));
      }

      const [playlist, count] = await query.getManyAndCount();
      cb(await Promise.all(playlist.map(async (pl) => {
        return {
          ...pl,
          volume: await this.getVolume(pl),
          forceVolume: pl.forceVolume || false,
        };
      })), count);
    });
    adminEndpoint(this.nsp, 'songs::save', async (item: SongPlaylistInterface, cb) => {
      cb(null, await getRepository(SongPlaylist).save(item));
    });
    adminEndpoint(this.nsp, 'songs::getAllBanned', async (where, cb) => {
      where = where || {};
      cb(null, await getRepository(SongBan).find(where));
    });
    adminEndpoint(this.nsp, 'songs::removeRequest', async (id: string, cb) => {
      cb(null, await getRepository(SongRequest).delete({id}));
    });
    publicEndpoint(this.nsp, 'songs::getAllRequests', async (where, cb) => {
      where = where || {};
      cb(null, await getRepository(SongRequest).find({
        ...where,
        order: {
          addedAt: 'ASC',
        },
      }));
    });
    adminEndpoint(this.nsp, 'delete.playlist', async (videoId, cb) => {
      await getRepository(SongPlaylist).delete({ videoId });
      cb();
    });
    adminEndpoint(this.nsp, 'delete.ban', async (videoId, cb) => {
      await getRepository(SongBan).delete({ videoId });
      cb();
    });
    adminEndpoint(this.nsp, 'import.ban', async (url, cb) => {
      cb(null, await this.banSongById({ parameters: this.getIdFromURL(url), sender: null }));
    });
    adminEndpoint(this.nsp, 'import.playlist', async (playlist, cb) => {
      cb(null, await this.importPlaylist({ parameters: playlist, sender: null }));
    });
    adminEndpoint(this.nsp, 'import.video', async (url, cb) => {
      cb(null, await this.addSongToPlaylist({ parameters: url, sender: null }));
    });
    adminEndpoint(this.nsp, 'next', async () => {
      this.sendNextSongID();
    });

    this.socket.on('connection', (socket) => {
      socket.on('disconnect', (reason) => {
        clearInterval(this.interval[socket.id]);
        delete this.interval[socket.id];
        delete this.isPlaying[socket.id];
      });
      this.interval[socket.id] = setInterval(async () => {
        socket.emit('isPlaying', (isPlaying) => this.isPlaying[socket.id] = isPlaying);
      }, 1000);
    });
  }

  getIdFromURL (url) {
    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = url.match(urlRegex);
    const videoID = (match && match[1].length === 11) ? match[1] : url;
    return videoID;
  }

  async getMeanLoudness () {
    const playlist = await getRepository(SongPlaylist).find();
    if (_.isEmpty(playlist)) {
      this.meanLoudness = -15;
      return -15;
    }

    let loudness = 0;
    for (const item of playlist) {
      if (_.isNil(item.loudness)) {
        loudness = loudness + -15;
      } else {
        loudness = loudness + item.loudness;
      }
    }
    this.meanLoudness = loudness / playlist.length;
    return loudness / playlist.length;
  }

  async getVolume (item) {
    if (!item.forceVolume && this.calculateVolumeByLoudness) {
      item.loudness = !_.isNil(item.loudness) ? item.loudness : -15;
      const volume = this.volume;
      const correction = Math.ceil((volume / 100) * 3);
      const loudnessDiff = this.meanLoudness - item.loudness;
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

  async setTrim (socket, data) {
    const song = await getRepository(SongPlaylist).findOne({videoId: data.id});
    if (song) {
      await getRepository(SongPlaylist).save({...song, startTime: data.lowValue, endTime: data.highValue});
    }
  }

  @command('!bansong')
  @default_permission(permission.CASTERS)
  banSong (opts) {
    opts.parameters.trim().length === 0 ? this.banCurrentSong(opts) : this.banSongById(opts);
  }

  async banCurrentSong (opts) {
    const currentSong = JSON.parse(this.currentSong);
    if (_.isNil(currentSong.videoID)) {
      return;
    }

    await getRepository(SongBan).save({ videoId: currentSong.videoID, title: currentSong.title });
    const message = await prepare('songs.song-was-banned', { name: currentSong.title });
    sendMessage(message, opts.sender, opts.attr);

    // send timeouts to all users who requested song
    const request = (await getRepository(SongRequest).find({ videoId: opts.parameters })).map(o => o.username);
    if (currentSong.videoID === opts.parameters) {
      request.push(currentSong.username);
    }
    for (const user of request) {
      timeout(user, translate('songs.song-was-banned-timeout-message'), 300);
    }

    await Promise.all([
      getRepository(SongPlaylist).delete({ videoId: currentSong.videoID }),
      getRepository(SongRequest).delete({ videoId: currentSong.videoID }),
    ]);

    this.getMeanLoudness();
    this.sendNextSongID();
    this.refreshPlaylistVolume();
  }

  @onChange('calculateVolumeByLoudness')
  async refreshPlaylistVolume () {
    const playlist = await getRepository(SongPlaylist).find();
    for (const item of playlist) {
      await getRepository(SongPlaylist).save({...item, volume: await this.getVolume(item)});
    }
  }

  async banSongById (opts) {
    let banned = 0;
    const waitForBan = () => {
      return new Promise((resolve, reject) => {
        const ban = (resolve) => {
          ytdl.getInfo('https://www.youtube.com/watch?v=' + opts.parameters, async (err, videoInfo) => {
            if (err) {
              error(err);
            } else if (!_.isNil(videoInfo) && !_.isNil(videoInfo.title)) {
              banned++;
              sendMessage(translate('songs.bannedSong').replace(/\$title/g, videoInfo.title), opts.sender, opts.attr);

              // send timeouts to all users who requested song
              const request = (await getRepository(SongRequest).find({ videoId: opts.parameters })).map(o => o.username);
              const currentSong = JSON.parse(this.currentSong);
              if (currentSong.videoID === opts.parameters) {
                request.push(currentSong.username);
              }
              for (const user of request) {
                timeout(user, translate('songs.bannedSongTimeout'), 300);
              }

              await Promise.all([
                getRepository(SongBan).save({ videoId: opts.parameters, title: videoInfo.title }),
                getRepository(SongPlaylist).delete({ videoId: opts.parameters }),
                getRepository(SongRequest).delete({ videoId: opts.parameters }),
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
    const removed = await getRepository(SongBan).delete({ videoId: opts.parameters });
    if ((removed.affected || 0) > 0) {
      sendMessage(translate('songs.song-was-unbanned'), opts.sender, opts.attr);
    } else {
      sendMessage(translate('songs.song-was-not-banned'), opts.sender, opts.attr);
    }
  }

  @command('!skipsong')
  @default_permission(permission.CASTERS)
  async sendNextSongID () {
    // check if there are any requests
    if (this.songrequest) {
      const sr = await getRepository(SongRequest).findOne({
        order: {
          addedAt: 'ASC',
        },
      });
      if (sr) {
        const currentSong: any = sr;
        currentSong.volume = await this.getVolume(currentSong);
        currentSong.type = 'songrequests';
        this.currentSong = JSON.stringify(currentSong);

        if (this.notify) {
          this.notifySong();
        }
        if (this.socket) {
          this.socket.emit('videoID', currentSong);
        }
        await getRepository(SongRequest).delete({ videoId: sr.videoId });
        return;
      }
    }

    // get song from playlist
    if (this.playlist) {
      const order: any = this.shuffle ? { seed: 'ASC' } : { lastPlayedAt: 'ASC' };
      const pl = await getRepository(SongPlaylist).findOne({ order });
      if (!pl) {
        if (this.socket) {
          this.socket.emit('videoID', null); // send null and skip to next empty song
        }
        return; // don't do anything if no songs in playlist
      }

      // shuffled song is played again
      if (this.shuffle && pl.seed === 1) {
        await this.createRandomSeeds();
        this.sendNextSongID(); // retry with new seeds
        return;
      }

      const updatedItem = await getRepository(SongPlaylist).save({...pl, seed: 1, lastPlayedAt: Date.now() });
      const currentSong = {
        ...updatedItem,
        volume: await this.getVolume(updatedItem),
        username: getBot(),
        type: 'playlist',
      };
      this.currentSong = JSON.stringify(currentSong);

      if (this.notify) {
        this.notifySong();
      }

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
    if (Object.values(this.isPlaying).find(o => o)) {
      if (!_.isNil(currentSong.title)) {
        if (currentSong.type === 'playlist') {
          translation = 'songs.current-song-from-playlist';
        } else {
          translation = 'songs.current-song-from-songrequest';
        }
      }
    }
    const message = await prepare(translation, { name: currentSong.title, username: currentSong.username });
    sendMessage(message, {
      username: oauth.botUsername,
      displayName: oauth.botUsername,
      userId: Number(oauth.botId),
      emotes: [],
      badges: {},
      'message-type': 'chat',
    });
  }

  async notifySong () {
    let translation;
    const currentSong = JSON.parse(this.currentSong);
    if (!_.isNil(currentSong.title)) {
      if (currentSong.type === 'playlist') {
        translation = 'songs.current-song-from-playlist';
      } else {
        translation = 'songs.current-song-from-songrequest';
      }
    } else {
      return;
    }
    const message = await prepare(translation, { name: currentSong.title, username: currentSong.username });
    sendMessage(message, {
      username: oauth.botUsername,
      displayName: oauth.botUsername,
      userId: Number(oauth.botId),
      emotes: [],
      badges: {},
      'message-type': 'chat',
    });
  }

  @command('!playlist steal')
  @default_permission(permission.CASTERS)
  async stealSong () {
    try {
      const currentSong = JSON.parse(this.currentSong);
      this.addSongToPlaylist({ sender: null, parameters: currentSong.videoID });
    } catch (err) {
      sendMessage(translate('songs.noCurrentSong'), {
        username: oauth.botUsername,
        displayName: oauth.botUsername,
        userId: Number(oauth.botId),
        emotes: [],
        badges: {},
        'message-type': 'chat',
      });
    }
  }

  async createRandomSeeds () {
    const playlist = await getRepository(SongPlaylist).find();
    for (const item of playlist) {
      await getRepository(SongPlaylist).save({...item, seed: Math.random()});
    }
  }

  @command('!playlist')
  @default_permission(permission.CASTERS)
  async help () {
    sendMessage(translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal', {
      username: oauth.botUsername,
      displayName: oauth.botUsername,
      userId: Number(oauth.botId),
      emotes: [],
      badges: {},
      'message-type': 'chat',
    });
  }

  @command('!songrequest')
  async addSongToQueue (opts) {
    if (opts.parameters.length < 1 || !this.songrequest) {
      if (this.songrequest) {
        sendMessage(translate('core.usage') + ': !songrequest <video-id|video-url|search-string>', opts.sender, opts.attr);
      } else {
        sendMessage('$sender, ' + translate('core.settings.songs.songrequest.false'), opts.sender, opts.attr);
      }
      return;
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const idRegex = /^[a-zA-Z0-9-_]{11}$/;
    const match = opts.parameters.match(urlRegex);
    const videoID = (match && match[1].length === 11) ? match[1] : opts.parameters;

    if (_.isNil(videoID.match(idRegex))) { // not id or url
      ytsearch(opts.parameters, { maxResults: 1, key: 'AIzaSyDYevtuLOxbyqBjh17JNZNvSQO854sngK0' }, (err, results) => {
        if (err) {
          return error(err);
        }
        if (typeof results !== 'undefined' && results[0].id) {
          opts.parameters = results[0].id;
          this.addSongToQueue(opts);
        }
      });
      return;
    }

    // is song banned?
    const ban = await getRepository(SongBan).findOne({ videoId: videoID });
    if (ban) {
      sendMessage(translate('songs.song-is-banned'), opts.sender, opts.attr);
      return;
    }

    // is correct category?
    if (this.onlyMusicCategory) {
      try {
        const video = await this.youtubeApi.getVideo(videoID);
        if (video.data.snippet.categoryId !== '10') {
          return sendMessage(translate('songs.incorrect-category'), opts.sender, opts.attr);
        }
      } catch (e) {}
    }

    ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID, async (err, videoInfo) => {
      if (err) {
        return error(err);
      }
      if (_.isUndefined(videoInfo) || _.isUndefined(videoInfo.title) || _.isNull(videoInfo.title)) {
        sendMessage(translate('songs.song-was-not-found'), opts.sender, opts.attr);
      } else if (Number(videoInfo.length_seconds) / 60 > this.duration) {
        sendMessage(translate('songs.song-is-too-long'), opts.sender, opts.attr);
      } else {
        getRepository(SongRequest).save({
          videoId: videoID,
          title: videoInfo.title,
          addedAt: Date.now(),
          loudness: Number(videoInfo.loudness ?? -15),
          length: Number(videoInfo.length_seconds),
          username: opts.sender.username,
        });
        const message = await prepare('songs.song-was-added-to-queue', { name: videoInfo.title });
        sendMessage(message, opts.sender, opts.attr);
        this.getMeanLoudness();
      }
    });
  }

  @command('!wrongsong')
  async removeSongFromQueue (opts) {
    const sr = await getRepository(SongRequest).findOne({
      where: { username: opts.sender.username },
      order: { addedAt: 'DESC' },
    });
    if (sr) {
      getRepository(SongRequest).remove(sr);
      const m = await prepare('songs.song-was-removed-from-queue', { name: sr.title });
      sendMessage(m, opts.sender, opts.attr);
      this.getMeanLoudness();
    }
  }

  @command('!playlist add')
  @default_permission(permission.CASTERS)
  async addSongToPlaylist (opts) {
    if (_.isNil(opts.parameters)) {
      return;
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = opts.parameters.match(urlRegex);
    const id = (match && match[1].length === 11) ? match[1] : opts.parameters;

    let imported = 0;
    let done = 0;

    const idsFromDB = (await getRepository(SongPlaylist).find()).map(o => o.videoId);
    const banFromDb = (await getRepository(SongBan).find()).map(o => o.videoId);

    if (idsFromDB.includes(id)) {
      info(`=> Skipped ${id} - Already in playlist`);
      done++;
    } else if (banFromDb.includes(id)) {
      info(`=> Skipped ${id} - Song is banned`);
      done++;
    } else {
      ytdl.getInfo('https://www.youtube.com/watch?v=' + id, async (err, videoInfo) => {
        done++;
        if (err) {
          return error(`=> Skipped ${id} - ${err.message}`);
        } else if (!_.isNil(videoInfo) && !_.isNil(videoInfo.title)) {
          info(`=> Imported ${id} - ${videoInfo.title}`);
          getRepository(SongPlaylist).save({
            videoId: id,
            title: videoInfo.title,
            loudness: Number(videoInfo.loudness ?? -15),
            length: Number(videoInfo.length_seconds),
            lastPlayedAt: Date.now(),
            seed: 1,
            volume: 20,
            startTime: 0,
            endTime: Number(videoInfo.length_seconds),
          });
          imported++;
        }
      });
    }

    const waitForImport = function () {
      return new Promise((resolve) => {
        const check = (resolve) => {
          if (done === 1) {
            resolve();
          } else {
            setTimeout(() => check(resolve), 500);
          }
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
    if (opts.parameters.length < 1) {
      return;
    }
    const videoID = opts.parameters;

    const song = await getRepository(SongPlaylist).findOne({ videoId: videoID });
    if (song) {
      getRepository(SongPlaylist).delete({ videoId: videoID });
      const message = await prepare('songs.song-was-removed-from-playlist', { name: song.title });
      sendMessage(message, opts.sender, opts.attr);
    } else {
      sendMessage(translate('songs.song-was-not-found'), opts.sender, opts.attr);
    }
  }

  async getSongsIdsFromPlaylist (playlist) {
    const get = function ():  Promise<{ items: any[] }> {
      return new Promise((resolve, reject): any => {
        ytpl(playlist, { limit: Number.MAX_SAFE_INTEGER }, function (err, playlist: { items: any[] }) {
          if (err) {
            reject(err);
          }
          resolve(playlist);
        });
      });
    };
    const data = await get();
    return data.items.map(o => o.id);
  }

  @command('!playlist import')
  @default_permission(permission.CASTERS)
  async importPlaylist (opts) {
    if (opts.parameters.length < 1) {
      return;
    }
    const ids = await this.getSongsIdsFromPlaylist(opts.parameters);

    if (ids.length === 0) {
      sendMessage(await prepare('songs.playlist-is-empty'), opts.sender, opts.attr);
    } else {
      let imported = 0;
      let done = 0;

      const idsFromDB = (await getRepository(SongPlaylist).find()).map(o => o.videoId);
      const banFromDb = (await getRepository(SongBan).find()).map(o => o.videoId);

      for (const id of ids) {
        if (idsFromDB.includes(id)) {
          info(`=> Skipped ${id} - Already in playlist`);
          done++;
        } else if (banFromDb.includes(id)) {
          info(`=> Skipped ${id} - Song is banned`);
          done++;
        } else {
          ytdl.getInfo('https://www.youtube.com/watch?v=' + id, async (err, videoInfo) => {
            done++;
            if (err) {
              return error(`=> Skipped ${id} - ${err.message}`);
            } else if (!_.isNil(videoInfo) && !_.isNil(videoInfo.title)) {
              info(`=> Imported ${id} - ${videoInfo.title}`);
              await getRepository(SongPlaylist).save({
                videoId: id,
                title: videoInfo.title,
                loudness: Number(videoInfo.loudness ?? - 15),
                length: Number(videoInfo.length_seconds),
                lastPlayedAt: Date.now(),
                seed: 1,
                volume: 20,
                startTime: 0,
                endTime: Number(videoInfo.length_seconds),
              });
              imported++;
            }
          });
        }
      }

      const waitForImport = function () {
        return new Promise((resolve) => {
          const check = (resolve) => {
            if (done === ids.length) {
              resolve();
            } else {
              setTimeout(() => check(resolve), 500);
            }
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

export default new Songs();
