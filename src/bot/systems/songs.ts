import * as _ from 'lodash';
import { isMainThread } from '../cluster';
import { setInterval } from 'timers';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import ytpl from 'ytpl';
import io from 'socket.io';

import { announce, getBot, getBotSender, isModerator, prepare, timeout } from '../commons';
import { command, default_permission, settings, shared, ui } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { onChange } from '../decorators/on';
import { error, info } from '../helpers/log';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { Brackets, getConnection, getRepository } from 'typeorm';
import { SongBan, SongPlaylist, SongPlaylistInterface, SongRequest } from '../database/entity/song';
import { translate } from '../translate';

let importInProgress = false;

class Songs extends System {
  interval: { [id: string]: NodeJS.Timeout } = {};

  @shared()
  meanLoudness = -15;
  @shared()
  currentSong: string = JSON.stringify({ videoID: null });
  @shared()
  isPlaying: {[socketId: string]: boolean } = {};

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

        this.addMenu({ category: 'manage', name: 'playlist', id: 'manage/songs/playlist', this: this });
        this.addMenu({ category: 'manage', name: 'bannedsongs', id: 'manage/songs/bannedsongs', this: this });
        this.addMenuPublic({ id: 'songrequests', name: 'songs'});
        this.addMenuPublic({ id: 'playlist', name: 'playlist'});
        this.addWidget('ytplayer', 'widget-title-ytplayer', 'fas fa-headphones');

      }, 10000);
    }
  }

  sockets () {
    if (this.socket === null) {
      setTimeout(() => this.sockets(), 100);
      return;
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
      cb(null, await Promise.all(playlist.map(async (pl) => {
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
      if (cb) {
        cb(null, await getRepository(SongBan).find(where));
      }
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
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'delete.ban', async (videoId, cb) => {
      await getRepository(SongBan).delete({ videoId });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'stop.import', () => {
      importInProgress = false;
    });
    adminEndpoint(this.nsp, 'import.ban', async (url, cb) => {
      cb(null, await this.banSongById({ parameters: this.getIdFromURL(url), sender: getBotSender(), command: '', createdAt: Date.now(), attr: {} }));
    });
    adminEndpoint(this.nsp, 'import.playlist', async (playlist, cb) => {
      try {
        cb(null, await this.importPlaylist({ parameters: playlist, sender: getBotSender(), command: '', createdAt: Date.now(), attr: {} }));
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'import.video', async (url, cb) => {
      try {
        cb(null, await this.addSongToPlaylist({ parameters: url, sender: getBotSender(), command: '', createdAt: Date.now(), attr: {} }));
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'next', async () => {
      this.sendNextSongID();
    });

    this.socket.on('connection', (socket: io.Socket) => {
      socket.on('disconnect', () => {
        clearInterval(this.interval[socket.id]);
        delete this.interval[socket.id];
        delete this.isPlaying[socket.id];
      });
      this.interval[socket.id] = setInterval(async () => {
        socket.emit('isPlaying', (isPlaying: boolean) => this.isPlaying[socket.id] = isPlaying);
      }, 1000);
    });
  }

  getIdFromURL (url: string) {
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

  async getVolume (item: SongPlaylistInterface) {
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

  async getCurrentVolume (socket: io.Socket) {
    let volume = 0;
    if (this.calculateVolumeByLoudness) {
      volume = await this.getVolume(JSON.parse(this.currentSong));
    } else {
      volume = this.volume;
    }
    socket.emit('newVolume', volume);
  }

  @command('!bansong')
  @default_permission(permission.CASTERS)
  banSong (opts: CommandOptions): Promise<CommandResponse[]> {
    return opts.parameters.trim().length === 0 ? this.banCurrentSong(opts) : this.banSongById(opts);
  }

  async banCurrentSong (opts: CommandOptions): Promise<CommandResponse[]> {
    const currentSong = JSON.parse(this.currentSong);
    if (_.isNil(currentSong.videoID)) {
      return [];
    }

    await getRepository(SongBan).save({ videoId: currentSong.videoID, title: currentSong.title });

    // send timeouts to all users who requested song
    const request = (await getRepository(SongRequest).find({ videoId: opts.parameters })).map(o => o.username);
    if (currentSong.videoID === opts.parameters) {
      request.push(currentSong.username);
    }
    for (const user of request) {
      timeout(user, translate('songs.song-was-banned-timeout-message'), 300, isModerator(opts.sender));
    }

    await Promise.all([
      getRepository(SongPlaylist).delete({ videoId: currentSong.videoID }),
      getRepository(SongRequest).delete({ videoId: currentSong.videoID }),
    ]);

    this.getMeanLoudness();
    this.sendNextSongID();
    this.refreshPlaylistVolume();

    const response = prepare('songs.song-was-banned', { name: currentSong.title });
    return [{ response, ...opts }];
  }

  @onChange('calculateVolumeByLoudness')
  async refreshPlaylistVolume () {
    const playlist = await getRepository(SongPlaylist).find();
    for (const item of playlist) {
      await getRepository(SongPlaylist).save({...item, volume: await this.getVolume(item)});
    }
  }

  async banSongById (opts: CommandOptions, retry = 0): Promise<CommandResponse[]> {
    const bannedSong = await new Promise((resolve: (value: ytdl.videoInfo | null) => any) => {
      const ban = async () => {
        try {
          const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + opts.parameters);
          // send timeouts to all users who requested song
          const request = (await getRepository(SongRequest).find({ videoId: opts.parameters })).map(o => o.username);
          const currentSong = JSON.parse(this.currentSong);
          if (currentSong.videoID === opts.parameters) {
            request.push(currentSong.username);
          }
          for (const user of request) {
            timeout(user, translate('songs.bannedSongTimeout'), 300, isModerator(opts.sender));
          }

          await Promise.all([
            getRepository(SongBan).save({ videoId: opts.parameters, title: videoInfo.videoDetails.title }),
            getRepository(SongPlaylist).delete({ videoId: opts.parameters }),
            getRepository(SongRequest).delete({ videoId: opts.parameters }),
          ]);
          resolve(videoInfo);
        } catch (e) {
          if (Number(retry ?? 0) < 5) {
            // try once more to be sure
            setTimeout(() => {
              this.banSongById(opts, (retry ?? 0) + 1 );
            }, 500);
          } else {
            error(e);
            resolve(null);
          }
        }
      };
      ban();
    });
    if (bannedSong) {
      this.getMeanLoudness();
      this.refreshPlaylistVolume();

      const currentSong = JSON.parse(this.currentSong);
      if (currentSong.videoID === opts.parameters) {
        this.sendNextSongID(); // skip song if its currently playing
      }
      return [{ response: translate('songs.bannedSong').replace(/\$title/g, bannedSong.title), ...opts }];
    } else {
      return [];
    }
  }

  @command('!unbansong')
  @default_permission(permission.CASTERS)
  async unbanSong (opts: CommandOptions): Promise<CommandResponse[]> {
    const removed = await getRepository(SongBan).delete({ videoId: opts.parameters });
    if ((removed.affected || 0) > 0) {
      return [{ response: translate('songs.song-was-unbanned'), ...opts }];
    } else {
      return [{ response: translate('songs.song-was-not-banned'), ...opts }];
    }
  }

  @command('!skipsong')
  @default_permission(permission.CASTERS)
  async sendNextSongID (): Promise<CommandResponse[]> {
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
        return [];
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
        return []; // don't do anything if no songs in playlist
      }

      // shuffled song is played again
      if (this.shuffle && pl.seed === 1) {
        await this.createRandomSeeds();
        return this.sendNextSongID(); // retry with new seeds
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
      return [];
    }

    // nothing to send
    if (this.socket) {
      this.socket.emit('videoID', null);
    }
    return [];
  }

  @command('!currentsong')
  async getCurrentSong (opts: CommandOptions): Promise<CommandResponse[]> {
    let translation = 'songs.no-song-is-currently-playing';
    const currentSong = JSON.parse(this.currentSong);
    if (currentSong.videoId !== null) {
      if (Object.values(this.isPlaying).find(o => o)) {
        if (!_.isNil(currentSong.title)) {
          if (currentSong.type === 'playlist') {
            translation = 'songs.current-song-from-playlist';
          } else {
            translation = 'songs.current-song-from-songrequest';
          }
        }
      }
    }

    const response = prepare(translation, currentSong.videoID !== null ? { name: currentSong.title, username: currentSong.username } : {});
    return [{ response, ...opts }];
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
    const message = prepare(translation, { name: currentSong.title, username: currentSong.username });
    announce(message);
  }

  @command('!playlist steal')
  @default_permission(permission.CASTERS)
  async stealSong (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const currentSong = JSON.parse(this.currentSong);
      return this.addSongToPlaylist({ sender: getBotSender(), parameters: currentSong.videoID, attr: {}, createdAt: Date.now(), command: '' });
    } catch (err) {
      return [{ response: translate('songs.noCurrentSong'), ...opts }];
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
  async help (opts: CommandOptions): Promise<CommandResponse[]> {
    return [{ response: translate('core.usage') + ': !playlist add <youtubeid> | !playlist remove <youtubeid> | !playlist ban <youtubeid> | !playlist random on/off | !playlist steal', ...opts }];
  }

  @command('!songrequest')
  async addSongToQueue (opts: CommandOptions, retry = 0): Promise<CommandResponse[]> {
    if (opts.parameters.length < 1 || !this.songrequest) {
      if (this.songrequest) {
        return [{ response: translate('core.usage') + ': !songrequest <video-id|video-url|search-string>', ...opts }];
      } else {
        return [{ response: '$sender, ' + translate('core.settings.songs.songrequest.false'), ...opts }];
      }
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const idRegex = /^[a-zA-Z0-9-_]{11}$/;
    const match = opts.parameters.match(urlRegex);
    const videoID = (match && match[1].length === 11) ? match[1] : opts.parameters;

    if (_.isNil(videoID.match(idRegex))) { // not id or url]
      try {
        const search: ytsr.result['items'] = await new Promise((resolve, reject) => {
          ytsr(opts.parameters, { limit: 1 }, (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result.items);
            }
          });
        });
        if (search.length > 0) {
          const videoId = /^\S+(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)(?<videoId>[^#&?]*).*/gi.exec(search[0].link)?.groups?.videoId;
          if (!videoId) {
            throw new Error('VideoID not parsed from ' + search[0].link);
          }
          opts.parameters = videoId;
          return this.addSongToQueue(opts);
        }
      } catch (e) {
        error(`SONGS: ${e.message}`);
      }
    }

    // is song banned?
    const ban = await getRepository(SongBan).findOne({ videoId: videoID });
    if (ban) {
      return [{ response: translate('songs.song-is-banned'), ...opts }];
    }

    return new Promise(async (resolve) => {
      try {
        const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID);
        if (Number(videoInfo.videoDetails.lengthSeconds) / 60 > this.duration) {
          resolve([{ response: translate('songs.song-is-too-long'), ...opts }]);
        } else if (videoInfo.videoDetails.category !== 'Music' && this.onlyMusicCategory) {
          if (Number(retry ?? 0) < 5) {
            // try once more to be sure
            setTimeout(() => {
              resolve(this.addSongToQueue(opts, (retry ?? 0) + 1 ));
            }, 500);
          }
          if (global.mocha) {
            error('-- TEST ONLY ERROR --');
            error({ category: videoInfo.videoDetails.category });
          }
          resolve([{ response: translate('songs.incorrect-category'), ...opts }]);
        } else {
          await getRepository(SongRequest).save({
            videoId: videoID,
            title: videoInfo.videoDetails.title,
            addedAt: Date.now(),
            loudness: Number(videoInfo.loudness ?? -15),
            length: Number(videoInfo.videoDetails.lengthSeconds),
            username: opts.sender.username,
          });
          this.getMeanLoudness();
          const response = prepare('songs.song-was-added-to-queue', { name: videoInfo.videoDetails.title });
          resolve([{ response, ...opts }]);
        }
      } catch (e) {
        if (Number(retry ?? 0) < 5) {
          // try once more to be sure
          setTimeout(() => {
            resolve(this.addSongToQueue(opts, (retry ?? 0) + 1 ));
          }, 500);
        } else {
          error(e);
          resolve([{ response: translate('songs.song-was-not-found'), ...opts }]);
        }
      }
    });
  }

  @command('!wrongsong')
  async removeSongFromQueue (opts: CommandOptions): Promise<CommandResponse[]> {
    const sr = await getRepository(SongRequest).findOne({
      where: { username: opts.sender.username },
      order: { addedAt: 'DESC' },
    });
    if (sr) {
      getRepository(SongRequest).remove(sr);
      this.getMeanLoudness();
      const response = prepare('songs.song-was-removed-from-queue', { name: sr.title });
      return [{ response, ...opts }];
    }
    return [];
  }

  @command('!playlist add')
  @default_permission(permission.CASTERS)
  async addSongToPlaylist (opts: CommandOptions): Promise<(CommandResponse & { imported: number; skipped: number })[]> {
    if (_.isNil(opts.parameters)) {
      return [];
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
      try {
        done++;
        const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + id);
        info(`=> Imported ${id} - ${videoInfo.videoDetails.title}`);
        getRepository(SongPlaylist).save({
          videoId: id,
          title: videoInfo.videoDetails.title,
          loudness: Number(videoInfo.loudness ?? -15),
          length: Number(videoInfo.length_seconds),
          lastPlayedAt: Date.now(),
          seed: 1,
          volume: 20,
          startTime: 0,
          endTime: Number(videoInfo.length_seconds),
        });
        imported++;
      } catch (e) {
        error(`=> Skipped ${id} - ${e.message}`);
      }
    }

    const waitForImport = function () {
      return new Promise((resolve) => {
        const check = () => {
          if (done === 1) {
            resolve();
          } else {
            setTimeout(() => check(), 500);
          }
        };
        check();
      });
    };

    await waitForImport();

    this.refreshPlaylistVolume();
    this.getMeanLoudness();
    return [{ response: prepare('songs.playlist-imported', { imported, skipped: done - imported }), imported, skipped: done - imported, ...opts }];
  }

  @command('!playlist remove')
  @default_permission(permission.CASTERS)
  async removeSongFromPlaylist (opts: CommandOptions): Promise<CommandResponse[]> {
    if (opts.parameters.length < 1) {
      return [];
    }
    const videoID = opts.parameters;

    const song = await getRepository(SongPlaylist).findOne({ videoId: videoID });
    if (song) {
      getRepository(SongPlaylist).delete({ videoId: videoID });
      const response = prepare('songs.song-was-removed-from-playlist', { name: song.title });
      return [{ response, ...opts }];
    } else {
      return [{ response: translate('songs.song-was-not-found'), ...opts }];
    }
  }

  async getSongsIdsFromPlaylist (playlist: string) {
    const get = function ():  Promise<{ items: any[] }> {
      return new Promise((resolve, reject): any => {
        ytpl(playlist, { limit: Number.MAX_SAFE_INTEGER }, function (err, pl: { items: any[] }) {
          if (err) {
            reject(err);
          }
          resolve(pl);
        });
      });
    };
    const data = await get();
    return data.items.map(o => o.id);
  }

  @command('!playlist import')
  @default_permission(permission.CASTERS)
  async importPlaylist (opts: CommandOptions): Promise<(CommandResponse & { imported: number; skipped: number })[]> {
    if (opts.parameters.length < 1) {
      return [];
    }
    const ids = await this.getSongsIdsFromPlaylist(opts.parameters);

    if (ids.length === 0) {
      return [{ response: prepare('songs.playlist-is-empty'), ...opts, imported: 0, skipped: 0 }];
    } else {
      let imported = 0;
      let done = 0;
      importInProgress = true;

      const idsFromDB = (await getRepository(SongPlaylist).find()).map(o => o.videoId);
      const banFromDb = (await getRepository(SongBan).find()).map(o => o.videoId);

      for (const id of ids) {
        if (!importInProgress) {
          info(`=> Skipped ${id} - Importing was canceled`);
        } else if (idsFromDB.includes(id)) {
          info(`=> Skipped ${id} - Already in playlist`);
          done++;
        } else if (banFromDb.includes(id)) {
          info(`=> Skipped ${id} - Song is banned`);
          done++;
        } else {
          try {
            done++;
            const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + id);
            info(`=> Imported ${id} - ${videoInfo.videoDetails.title}`);
            await getRepository(SongPlaylist).save({
              videoId: id,
              title: videoInfo.videoDetails.title,
              loudness: Number(videoInfo.loudness ?? - 15),
              length: Number(videoInfo.length_seconds),
              lastPlayedAt: Date.now(),
              seed: 1,
              volume: 20,
              startTime: 0,
              endTime: Number(videoInfo.length_seconds),
            });
            imported++;
          } catch (e) {
            error(`=> Skipped ${id} - ${e.message}`);
          }
        }
      }

      await this.refreshPlaylistVolume();
      await this.getMeanLoudness();
      info(`=> Playlist import done, ${imported} imported, ${done - imported} skipped`);
      return [{ response: prepare('songs.playlist-imported', { imported, skipped: done - imported }), imported, skipped: done - imported, ...opts}];
    }
  }
}

export default new Songs();
