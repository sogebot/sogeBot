import type { Filter } from '@devexpress/dx-react-grid';
import {
  currentSongType,
  SongBan, SongPlaylist, SongRequest,
} from '@entity/song.js';
import { User } from '@entity/user.js';
import * as _ from 'lodash-es';
import { nanoid } from 'nanoid';
import io from 'socket.io';
import {
  Brackets, In, Like,
} from 'typeorm';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import ytsr from 'ytsr';

import System from './_interface.js';
import { onChange, onStartup } from '../decorators/on.js';
import {
  command, default_permission, persistent, settings, ui,
} from '../decorators.js';

import { AppDataSource } from '~/database.js';
import {
  announce, getUserSender, prepare,
} from '~/helpers/commons/index.js';
import { error, info } from '~/helpers/log.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';
import { tmiEmitter } from '~/helpers/tmi/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import getBotId from '~/helpers/user/getBotId.js';
import getBotUserName from '~/helpers/user/getBotUserName.js';
import { isModerator } from '~/helpers/user/isModerator.js';
import { translate } from '~/translate.js';

let importInProgress = false;
const cachedTags = new Set<string>();
let isCachedTagsValid = false;
const emptyCurrentSong = {
  videoId: null, title: '', type: '', username: '', volume: 0, loudness: 0, forceVolume: false, startTime: 0, endTime: Number.MAX_SAFE_INTEGER,
};

class Songs extends System {
  interval: { [id: string]: NodeJS.Timeout } = {};

  meanLoudness = -15;
  currentSong = JSON.stringify(emptyCurrentSong as currentSongType);
  isPlaying: {[socketId: string]: boolean } = {};
  @persistent()
    currentTag = 'general';

  @settings()
  @ui({
    type: 'number-input',
    step: '1',
    min:  '0',
    max:  '100',
  })
    volume = 25;
  @settings()
    duration = 10;
  @settings()
    shuffle = true;
  @settings()
    songrequest = true;
  @settings()
    allowRequestsOnlyFromPlaylist = false;
  @settings()
    playlist = true;
  @settings()
    notify = false;
  @settings()
    onlyMusicCategory = false;
  @settings()
    calculateVolumeByLoudness = true;

  @onStartup()
  startup() {
    this.getMeanLoudness();
    this.addMenu({
      category: 'manage', name: 'playlist', id: 'manage/songs/playlist', this: this,
    });
    this.addMenu({
      category: 'manage', name: 'bannedsongs', id: 'manage/songs/bannedsongs', this: this,
    });
    this.addMenuPublic({ id: 'songrequests', name: 'songs' });
    this.addMenuPublic({ id: 'playlist', name: 'playlist' });
  }

  async getTags() {
    if (isCachedTagsValid) {
      return [...cachedTags];
    } else {
      cachedTags.clear();
      isCachedTagsValid = true;
      for (const item of await SongPlaylist.find()) {
        for (const tag of item.tags) {
          cachedTags.add(tag);
        }
      }
      return [...cachedTags];
    }
  }

  sockets () {
    if (this.socket === null) {
      setTimeout(() => this.sockets(), 100);
      return;
    }
    adminEndpoint('/systems/songs', 'songs::currentSong', async (cb) => {
      cb(null, JSON.parse(this.currentSong));
    });
    adminEndpoint('/systems/songs', 'set.playlist.tag', async (tag) => {
      if (this.currentTag !== tag) {
        info(`SONGS: Playlist changed to ${tag}`);
      }
      this.currentTag = tag;
    });
    publicEndpoint('/systems/songs', 'current.playlist.tag', async (cb) => {
      cb(null, this.currentTag);
    });
    adminEndpoint('/systems/songs', 'get.playlist.tags', async (cb) => {
      try {
        cb(null, await this.getTags());
      } catch (e: any) {
        cb(e, []);
      }
    });
    publicEndpoint('/systems/songs', 'find.playlist', async (opts: { filters?: Filter[], page: number, search?: string, tag?: string | null, perPage: number}, cb) => {
      opts.page = opts.page ?? 0;
      opts.perPage = opts.perPage ?? 25;

      if (opts.perPage === -1) {
        opts.perPage = Number.MAX_SAFE_INTEGER;
      }
      const query = SongPlaylist.createQueryBuilder('playlist')
        .offset(opts.page * opts.perPage)
        .limit(opts.perPage);

      // filter generator for new UI
      for (const filter of opts.filters || []) {
        const name = nanoid();

        if (filter.operation === 'includes') {
          query.andWhere(new Brackets(w => {
            for (let i = 0; i < filter.value.length; i++) {
              const name2 = nanoid();
              const value = filter.value[i];
              if  (['postgres'].includes(AppDataSource.options.type.toLowerCase())) {
                w[i === 0 ? 'where' : 'orWhere'](`"playlist"."${filter.columnName}" like :${name2}`, { [name2]: `%${value}%` });
              } else {
                w[i === 0 ? 'where' : 'orWhere'](`playlist.${filter.columnName} like :${name2}`, { [name2]: `%${value}%` });
              }
            }
          }));
        }

        if (filter.operation === 'contains') {
          if  (['postgres'].includes(AppDataSource.options.type.toLowerCase())) {
            query.andWhere(`"playlist"."${filter.columnName}" like :${name}`, { [name]: `%${filter.value}%` });
          } else {
            query.andWhere(`playlist.${filter.columnName} like :${name}`, { [name]: `%${filter.value}%` });
          }
        }
        if (filter.operation === 'equal') {
          if  (['postgres'].includes(AppDataSource.options.type.toLowerCase())) {
            query.andWhere(`"playlist"."${filter.columnName}" = :${name}`, { [name]: `${filter.value}` });
          } else {
            query.andWhere(`playlist.${filter.columnName} =:${name}`, { [name]: `${filter.value}` });
          }
        }
        if (filter.operation === 'notEqual') {
          if  (['postgres'].includes(AppDataSource.options.type.toLowerCase())) {
            query.andWhere(`"playlist"."${filter.columnName}" != :${name}`, { [name]: `${filter.value}` });
          } else {
            query.andWhere(`playlist.${filter.columnName} != :${name}`, { [name]: `${filter.value}` });
          }
        }
      }

      if (typeof opts.search !== 'undefined') {
        query.andWhere(new Brackets(w => {
          if  (['postgres'].includes(AppDataSource.options.type.toLowerCase())) {
            w.where('"playlist"."videoId" like :like', { like: `%${opts.search}%` });
            w.orWhere('"playlist"."title" like :like', { like: `%${opts.search}%` });
          } else {
            w.where('playlist.videoId like :like', { like: `%${opts.search}%` });
            w.orWhere('playlist.title like :like', { like: `%${opts.search}%` });
          }
        }));
      }

      if (opts.tag) {
        query.andWhere(new Brackets(w => {
          if  (['postgres'].includes(AppDataSource.options.type.toLowerCase())) {
            w.where('"playlist"."tags" like :tag', { tag: `%${opts.tag}%` });
          } else {
            w.where('playlist.tags like :tag', { tag: `%${opts.tag}%` });
          }

        }));
      }
      const [playlist, count] = await query.getManyAndCount();
      cb(null, await Promise.all(playlist.map(async (pl) => {
        return {
          ...pl,
          volume:      await this.getVolume(pl),
          forceVolume: pl.forceVolume || false,
        };
      })), count);
    });
    adminEndpoint('/systems/songs', 'songs::save', async (item: SongPlaylist, cb) => {
      isCachedTagsValid = false;
      cb(null, await SongPlaylist.save(item));
    });
    adminEndpoint('/systems/songs', 'songs::getAllBanned', async (where, cb) => {
      where ??= {};
      if (cb) {
        cb(null, await SongBan.find(where));
      }
    });
    adminEndpoint('/systems/songs', 'songs::removeRequest', async (id: string, cb) => {
      await SongRequest.delete({ id });
      cb(null);
    });
    publicEndpoint('/systems/songs', 'songs::getAllRequests', async (where, cb) => {
      where = where || {};
      cb(null, await SongRequest.find({
        ...where,
        order: { addedAt: 'ASC' },
      }));
    });
    adminEndpoint('/systems/songs', 'delete.playlist', async (videoId, cb) => {
      isCachedTagsValid = false;
      await SongPlaylist.delete({ videoId });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/systems/songs', 'delete.ban', async (videoId, cb) => {
      await SongBan.delete({ videoId });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/systems/songs', 'stop.import', () => {
      importInProgress = false;
    });
    adminEndpoint('/systems/songs', 'import.ban', async (url, cb) => {
      try {
        cb(null, await this.banSong({
          isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, parameters: this.getIdFromURL(url), sender: getUserSender(getBotId(), getBotUserName()), command: '', createdAt: Date.now(), attr: {}, discord: undefined,
        }));
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/systems/songs', 'import.playlist', async ({ playlist, forcedTag }, cb) => {
      try {
        isCachedTagsValid = false;
        cb(null, await this.importPlaylist({
          isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, parameters: playlist, sender: getUserSender(getBotId(), getBotUserName()), command: '', createdAt: Date.now(), attr: { forcedTag }, discord: undefined,
        }));
      } catch (e: any) {
        cb(e.stack, null);
      }
    });
    adminEndpoint('/systems/songs', 'import.video', async ({ playlist, forcedTag }, cb) => {
      try {
        cb(null, await this.addSongToPlaylist({
          isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, parameters: playlist, sender: getUserSender(getBotId(), getBotUserName()), command: '', createdAt: Date.now(), attr: { forcedTag }, discord: undefined,
        }));
      } catch (e: any) {
        cb(e.stack, null);
      }
    });
    adminEndpoint('/systems/songs', 'next', async () => {
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
    const playlist = await SongPlaylist.find();
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

  async getVolume (item: SongPlaylist | currentSongType) {
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
  @default_permission(defaultPermissions.CASTERS)
  async banSong (opts: CommandOptions): Promise<CommandResponse[]> {
    const videoID: string | null = opts.parameters.trim().length === 0 ? JSON.parse(this.currentSong).videoId : opts.parameters.trim();
    if (!videoID) {
      throw new Error('Unknown videoId to ban song.');
    }
    const videoTitle: string | null = (opts.parameters.trim().length === 0 ? JSON.parse(this.currentSong).title : (await this.getVideoDetails(videoID))?.videoDetails.title) ?? null;
    if (!videoTitle) {
      throw new Error('Cannot fetch video data, check your url or try again later.');
    }

    // send timeouts to all users who requested song
    const request = (await SongRequest.findBy({ videoId: videoID })).map(o => o.username);
    if (JSON.parse(this.currentSong).videoId === videoID) {
      request.push(JSON.parse(this.currentSong).username);
    }
    await changelog.flush();
    const users = await AppDataSource.getRepository(User).findBy({ userName: In(request) });
    for (const username of request) {
      const data = users.find(o => o.userName === username);
      tmiEmitter.emit('timeout', username, 300,
        {
          mod: typeof data !== 'undefined' && isModerator(data),
        });
    }

    const songBan = SongBan.create({ videoId: videoID, title: videoTitle });
    await Promise.all([
      songBan.save(),
      SongPlaylist.delete({ videoId: videoID }),
      SongRequest.delete({ videoId: videoID }),
    ]);

    this.getMeanLoudness();
    this.sendNextSongID();
    this.refreshPlaylistVolume();

    info(`Song ${videoTitle} (${videoID}) was added to banlist`);
    const response = prepare('songs.song-was-banned', { name: videoTitle });
    return [{ response, ...opts }];
  }

  @onChange('calculateVolumeByLoudness')
  async refreshPlaylistVolume () {
    const playlist = await SongPlaylist.find();
    for (const item of playlist) {
      item.volume = await this.getVolume(item);
      await item.save();
    }
  }

  async getVideoDetails (id: string): Promise<ytdl.videoInfo | null> {
    return await new Promise((resolve: (value: ytdl.videoInfo) => any, reject) => {
      let retry = 0;
      const load = async () => {
        try {
          resolve(await ytdl.getInfo('https://www.youtube.com/watch?v=' + id));
        } catch (e: any) {
          if (Number(retry ?? 0) < 5) {
            setTimeout(() => {
              retry++;
              load();
            }, 500);
          } else {
            reject(e);
          }
        }
      };
      load();
    });
  }

  @command('!unbansong')
  @default_permission(defaultPermissions.CASTERS)
  async unbanSong (opts: CommandOptions): Promise<CommandResponse[]> {
    const removed = await SongBan.delete({ videoId: opts.parameters });
    if ((removed.affected || 0) > 0) {
      return [{ response: translate('songs.song-was-unbanned'), ...opts }];
    } else {
      return [{ response: translate('songs.song-was-not-banned'), ...opts }];
    }
  }

  @command('!skipsong')
  @default_permission(defaultPermissions.CASTERS)
  async sendNextSongID (): Promise<CommandResponse[]> {
    this.currentSong = JSON.stringify(emptyCurrentSong);

    // check if there are any requests
    if (this.songrequest) {
      const sr = await SongRequest.find({ order: { addedAt: 'ASC' }, take: 1 });
      if (sr[0]) {
        const currentSong: any = sr[0];
        currentSong.volume = await this.getVolume(currentSong);
        currentSong.type = 'songrequests';
        this.currentSong = JSON.stringify(currentSong);

        if (this.notify) {
          this.notifySong();
        }
        await SongRequest.delete({ videoId: sr[0].videoId });
        return [];
      }
    }

    // get song from playlist
    if (this.playlist) {
      if (!(await this.getTags()).includes(this.currentTag)) {
        // tag is not in db
        return [];
      }
      const order: any = this.shuffle ? { seed: 'ASC' } : { lastPlayedAt: 'ASC' };
      const pl = await SongPlaylist.find({ order, take: 1 });
      if (!pl[0]) {
        return []; // don't do anything if no songs in playlist
      }

      // shuffled song is played again
      if (this.shuffle && pl[0].seed === 1) {
        await this.createRandomSeeds();
        return this.sendNextSongID(); // retry with new seeds
      }

      if (!pl[0].tags.includes(this.currentTag)) {
        pl[0].seed = 1;
        await pl[0].save();
        return this.sendNextSongID(); // get next song as this don't belong to tag
      }

      pl[0].seed = 1;
      pl[0].lastPlayedAt = new Date().toISOString();
      await pl[0].save();
      const currentSong = {
        videoId:     pl[0].videoId,
        title:       pl[0].title,
        type:        'playlist',
        username:    getBotUserName(),
        forceVolume: pl[0].forceVolume,
        loudness:    pl[0].loudness,
        volume:      await this.getVolume(pl[0]),
        endTime:     pl[0].endTime,
        startTime:   pl[0].startTime,
      };
      this.currentSong = JSON.stringify(currentSong);

      if (this.notify) {
        this.notifySong();
      }
      return [];
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

    const response = prepare(translation, currentSong.videoId !== null ? { name: currentSong.title, username: currentSong.username } : {});
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
    announce(message, 'songs');
  }

  @command('!playlist steal')
  @default_permission(defaultPermissions.CASTERS)
  async stealSong (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const currentSong = JSON.parse(this.currentSong);

      if (currentSong.videoId === null) {
        throw new Error();
      }

      return this.addSongToPlaylist({
        ...opts, sender: getUserSender(getBotId(), getBotUserName()), parameters: currentSong.videoId, attr: {}, createdAt: Date.now(), command: '',
      });
    } catch (err: any) {
      return [{ response: translate('songs.no-song-is-currently-playing'), ...opts }];
    }
  }

  async createRandomSeeds () {
    const playlist = await SongPlaylist.find();
    for (const item of playlist) {
      item.seed = Math.random();
      await item.save();
    }
  }

  @command('!playlist')
  @default_permission(defaultPermissions.CASTERS)
  async playlistCurrent (opts: CommandOptions): Promise<CommandResponse[]> {
    return [{ response: prepare('songs.playlist-current', { playlist: this.currentTag }), ...opts }];
  }

  @command('!playlist list')
  @default_permission(defaultPermissions.CASTERS)
  async playlistList (opts: CommandOptions): Promise<CommandResponse[]> {
    return [{ response: prepare('songs.playlist-list', { list: (await this.getTags()).join(', ') }), ...opts }];
  }

  @command('!playlist set')
  @default_permission(defaultPermissions.CASTERS)
  async playlistSet (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const tags = await this.getTags();
      if (!tags.includes(opts.parameters)) {
        throw new Error(prepare('songs.playlist-not-exist', { playlist: opts.parameters }));
      }

      this.currentTag = opts.parameters;
      return [{ response: prepare('songs.playlist-set', { playlist: opts.parameters }), ...opts }];
    } catch (e: any) {
      return [{ response: e.message, ...opts }];

    }
  }

  @command('!songrequest')
  async addSongToQueue (opts: CommandOptions, retry = 0): Promise<CommandResponse[]> {
    if (opts.parameters.length < 1 || !this.songrequest) {
      if (this.songrequest) {
        return [{ response: translate('core.usage') + ': !songrequest <video-id|video-url|search-string>', ...opts }];
      } else {
        return [{ response: '$sender, ' + translate('songs.songrequest-disabled'), ...opts }];
      }
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const idRegex = /^[a-zA-Z0-9-_]{11}$/;
    const match = opts.parameters.match(urlRegex);
    const videoID = (match && match[1].length === 11) ? match[1] : opts.parameters;

    if (_.isNil(videoID.match(idRegex))) { // not id or url]
      try {
        const search = await ytsr(opts.parameters, { limit: 1 });
        if (search.items.length > 0 && search.items[0].type === 'video') {
          const videoId = /^\S+(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)(?<videoId>[^#&?]*).*/gi.exec(search.items[0].url)?.groups?.videoId;
          if (!videoId) {
            throw new Error('VideoID not parsed from ' + search.items[0].url);
          }
          opts.parameters = videoId;
          return this.addSongToQueue(opts);
        }
      } catch (e: any) {
        error(`SONGS: ${e.message}`);
        return [{ response: translate('songs.youtube-is-not-responding-correctly'), ...opts }];
      }
    }

    // is song banned?
    const ban = await SongBan.findOneBy({ videoId: videoID });
    if (ban) {
      return [{ response: translate('songs.song-is-banned'), ...opts }];
    }

    // check if song is in playlist
    if (this.allowRequestsOnlyFromPlaylist) {
      const inPlaylist = await SongPlaylist.count({
        where: {
          videoId: videoID,
          tags:    Like(`%${this.currentTag}%`),
        },
      }) > 0;
      if (!inPlaylist) {
        return [{ response: translate('songs.this-song-is-not-in-playlist'), ...opts }];
      }
    }

    try {
      const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + videoID);
      if (Number(videoInfo.videoDetails.lengthSeconds) / 60 > this.duration) {
        return [{ response: translate('songs.song-is-too-long'), ...opts }];
      } else if (videoInfo.videoDetails.category !== 'Music' && this.onlyMusicCategory) {
        if (Number(retry ?? 0) < 5) {
          // try once more to be sure
          await new Promise((resolve) => {
            setTimeout(() => resolve(true), 500);
          });
          return this.addSongToQueue(opts, (retry ?? 0) + 1 );
        }
        if (typeof (global as any).it === 'function') {
          error('-- TEST ONLY ERROR --');
          error({ category: videoInfo.videoDetails.category });
        }
        return [{ response: translate('songs.incorrect-category'), ...opts }];
      } else {
        const songRequest = SongRequest.create({
          videoId:  videoID,
          title:    videoInfo.videoDetails.title,
          loudness: Number(videoInfo.loudness ?? -15),
          length:   Number(videoInfo.videoDetails.lengthSeconds),
          username: opts.sender.userName,
        });
        await songRequest.save();
        this.getMeanLoudness();
        const response = prepare('songs.song-was-added-to-queue', { name: videoInfo.videoDetails.title });
        return [{ response, ...opts }];
      }
    } catch (e: any) {
      if (Number(retry ?? 0) < 5) {
        // try once more to be sure
        await new Promise((resolve) => {
          setTimeout(() => resolve(true), 500);
        });
        return this.addSongToQueue(opts, (retry ?? 0) + 1 );
      } else {
        error(e);
        return [{ response: translate('songs.song-was-not-found'), ...opts }];
      }
    }
  }

  @command('!wrongsong')
  async removeSongFromQueue (opts: CommandOptions): Promise<CommandResponse[]> {
    const sr = await SongRequest.findOne({
      where: { username: opts.sender.userName },
      order: { addedAt: 'DESC' },
    });
    if (sr) {
      SongRequest.remove(sr);
      this.getMeanLoudness();
      const response = prepare('songs.song-was-removed-from-queue', { name: sr.title });
      return [{ response, ...opts }];
    }
    return [];
  }

  @command('!playlist add')
  @default_permission(defaultPermissions.CASTERS)
  async addSongToPlaylist (opts: CommandOptions): Promise<CommandResponse[]> {
    if (_.isNil(opts.parameters)) {
      return [];
    }

    const urlRegex = /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = opts.parameters.match(urlRegex);
    const id = (match && match[1].length === 11) ? match[1] : opts.parameters;

    const idsFromDB = (await SongPlaylist.find()).map(o => o.videoId);
    const banFromDb = (await SongBan.find()).map(o => o.videoId);

    if (idsFromDB.includes(id)) {
      info(`=> Skipped ${id} - Already in playlist`);
      return [{ response: prepare('songs.song-is-already-in-playlist', { name: (await SongPlaylist.findOneByOrFail({ videoId: id })).title }), ...opts }];
    } else if (banFromDb.includes(id)) {
      info(`=> Skipped ${id} - Song is banned`);
      return [{ response: prepare('songs.song-is-banned', { name: (await SongPlaylist.findOneByOrFail({ videoId: id })).title }), ...opts }];
    } else {
      const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + id);
      if (videoInfo) {
        info(`=> Imported ${id} - ${videoInfo.videoDetails.title}`);
        const songPlaylist = SongPlaylist.create({
          videoId:      id,
          title:        videoInfo.videoDetails.title,
          loudness:     Number(videoInfo.loudness ?? -15),
          length:       Number(videoInfo.videoDetails.lengthSeconds),
          lastPlayedAt: new Date().toISOString(),
          seed:         1,
          volume:       20,
          startTime:    0,
          tags:         [ opts.attr.forcedTag ? opts.attr.forcedTag : this.currentTag ],
          endTime:      Number(videoInfo.videoDetails.lengthSeconds),
        });
        await songPlaylist.save();
        this.refreshPlaylistVolume();
        this.getMeanLoudness();
        isCachedTagsValid = false;
        return [{ response: prepare('songs.song-was-added-to-playlist', { name: videoInfo.videoDetails.title }), ...opts }];
      } else {
        return [{ response: translate('songs.youtube-is-not-responding-correctly'), ...opts }];
      }
    }
  }

  @command('!playlist remove')
  @default_permission(defaultPermissions.CASTERS)
  async removeSongFromPlaylist (opts: CommandOptions): Promise<CommandResponse[]> {
    if (opts.parameters.length < 1) {
      return [];
    }
    const videoID = opts.parameters;

    const song = await SongPlaylist.findOneBy({ videoId: videoID });
    if (song) {
      SongPlaylist.delete({ videoId: videoID });
      const response = prepare('songs.song-was-removed-from-playlist', { name: song.title });
      isCachedTagsValid = false;
      return [{ response, ...opts }];
    } else {
      return [{ response: translate('songs.song-was-not-found'), ...opts }];
    }
  }

  async getSongsIdsFromPlaylist (playlist: string) {
    try {
      const data = await ytpl(playlist, { limit: Number.MAX_SAFE_INTEGER });
      return data.items.map(o => o.id);
    } catch (e: any) {
      error(e);
    }
  }

  @command('!playlist import')
  @default_permission(defaultPermissions.CASTERS)
  async importPlaylist (opts: CommandOptions): Promise<(CommandResponse & { imported: number; skipped: number })[]> {
    if (opts.parameters.length < 1) {
      return [];
    }
    const ids = await this.getSongsIdsFromPlaylist(opts.parameters);

    if (!ids || ids.length === 0) {
      return [{
        response: prepare('songs.playlist-is-empty'), ...opts, imported: 0, skipped: 0,
      }];
    } else {
      let imported = 0;
      let done = 0;
      importInProgress = true;

      const idsFromDB = (await SongPlaylist.find()).map(o => o.videoId);
      const banFromDb = (await SongBan.find()).map(o => o.videoId);

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
            const songPlaylist = SongPlaylist.create({
              videoId:      id,
              title:        videoInfo.videoDetails.title,
              loudness:     Number(videoInfo.loudness ?? - 15),
              length:       Number(videoInfo.videoDetails.lengthSeconds),
              lastPlayedAt: new Date().toISOString(),
              seed:         1,
              volume:       20,
              startTime:    0,
              tags:         [ opts.attr.forcedTag ? opts.attr.forcedTag : this.currentTag ],
              endTime:      Number(videoInfo.videoDetails.lengthSeconds),
            });
            await songPlaylist.save();
            imported++;
          } catch (e: any) {
            error(`=> Skipped ${id} - ${e.message}`);
          }
        }
      }

      await this.refreshPlaylistVolume();
      await this.getMeanLoudness();
      info(`=> Playlist import done, ${imported} imported, ${done - imported} skipped`);
      isCachedTagsValid = false;
      return [{
        response: prepare('songs.playlist-imported', { imported, skipped: done - imported }), imported, skipped: done - imported, ...opts,
      }];
    }
  }
}

export default new Songs();
