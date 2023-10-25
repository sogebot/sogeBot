
/* global */
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { SongRequest, SongPlaylist } from '../../../dest/database/entity/song.js';
import { user } from '../../general.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

describe('Songs - addSongToQueue() - @func1', () => {
  let songs;
  before(async () => {
    songs = (await import('../../../dest/systems/songs.js')).default;
  });
  describe('Add music song by videoId', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoId = 'bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoId}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoId, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by url', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoUrl = 'https://www.youtube.com/watch?v=bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoUrl}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoUrl, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by search string', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoSearch = 'The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover)';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoSearch}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoSearch, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by videoId - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoId = 'bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoId}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoId, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by url - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoUrl = 'https://www.youtube.com/watch?v=bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoUrl}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoUrl, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by search string - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoSearch = 'The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover)';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoSearch}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoSearch, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add non-music video by videoId - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoId = 'RwtZrI6HuwY';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add non-music video ${videoId}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoId, sender: user.owner });
      assert.strictEqual(r[0].response, 'Sorry, $sender, but this song must be music category');
    });

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });
  });

  describe('Add non-music video by url - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoUrl = 'https://www.youtube.com/watch?v=RwtZrI6HuwY';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add non-music video ${videoUrl}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoUrl, sender: user.owner });
      assert.strictEqual(r[0].response, 'Sorry, $sender, but this song must be music category');
    });

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });
  });

  describe('Add non-music video by search string - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoSearch = 'Annoying customers after closing time - In and Out';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add non-music video ${videoSearch}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoSearch, sender: user.owner });
      assert.strictEqual(r[0].response, 'Sorry, $sender, but this song must be music category');
    });

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });
  });

  describe('Add music song by videoId', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
      songs.allowRequestsOnlyFromPlaylist = false;
    });
    const videoId = 'bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoId}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoId, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by url - allowRequestsOnlyFromPlaylist', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
      songs.allowRequestsOnlyFromPlaylist = true;
    });
    const videoUrl = 'https://www.youtube.com/watch?v=bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await AppDataSource.getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add songs to playlist`, async () => {
      await AppDataSource.getRepository(SongPlaylist).save({
        videoId:   'bmQwZhcZkbU',
        seed:      0,
        title:     'test',
        loudness:  0,
        length:    0,
        volume:    0,
        startTime: 0,
        endTime:   0,
        tags:      ['general', 'lorem'],
      });
      await AppDataSource.getRepository(SongPlaylist).save({
        videoId:   'RwtZrI6HuwY',
        seed:      0,
        endTime:   0,
        startTime: 0,
        volume:    0,
        length:    0,
        title:     'test2',
        loudness:  0,
        tags:      ['lorem'],
      });
    });

    it(`Add song bmQwZhcZkbU from playlist`, async () => {
      const r = await songs.addSongToQueue({ parameters: 'bmQwZhcZkbU', sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Add song RwtZrI6HuwY without playlist`, async () => {
      const r = await songs.addSongToQueue({ parameters: 'RwtZrI6HuwY', sender: user.owner });
      assert.strictEqual(r[0].response, 'Sorry, $sender, but this song is not in current playlist');
    });
  });
});
