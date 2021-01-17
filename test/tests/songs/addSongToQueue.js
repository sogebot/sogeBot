/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it  */
const assert = require('assert');

const { getRepository } = require('typeorm');

const { SongRequest } = require('../../../dest/database/entity/song');
const user = require('../../general.js').user;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

let songs;
describe('Songs - addSongToQueue()', () => {
  before(() => {
    songs = (require('../../../dest/systems/songs')).default;
  });
  describe('Add music song by videoId', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
    });
    const videoId = 'bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoId}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoId, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by url', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
    });
    const videoUrl = 'https://www.youtube.com/watch?v=bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoUrl}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoUrl, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by search string', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = false;
    });
    const videoSearch = 'The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover)';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoSearch}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoSearch, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by videoId - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
    });
    const videoId = 'bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoId}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoId, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by url - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
    });
    const videoUrl = 'https://www.youtube.com/watch?v=bmQwZhcZkbU';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoUrl}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoUrl, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add music song by search string - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
    });
    const videoSearch = 'The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover)';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add music song ${videoSearch}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoSearch, sender: user.owner });
      assert.strictEqual(r[0].response, '$sender, song The Witcher 3 - Steel for Humans / Lazare (Gingertail Cover) was added to queue');
    });

    it(`Queue contains song`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 1);
    });
  });

  describe('Add non-music video by videoId - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
    });
    const videoId = 'RwtZrI6HuwY';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add non-music video ${videoId}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoId, sender: user.owner });
      assert.strictEqual(r[0].response, 'Sorry, $sender, but this song must be music category');
    });

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });
  });

  describe('Add non-music video by url - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
    });
    const videoUrl = 'https://www.youtube.com/watch?v=RwtZrI6HuwY';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add non-music video ${videoUrl}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoUrl, sender: user.owner });
      assert.strictEqual(r[0].response, 'Sorry, $sender, but this song must be music category');
    });

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });
  });

  describe('Add non-music video by search string - music only', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      songs.onlyMusicCategory = true;
    });
    const videoSearch = 'Annoying customers after closing time - In and Out';

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });

    it(`Add non-music video ${videoSearch}`, async () => {
      const r = await songs.addSongToQueue({ parameters: videoSearch, sender: user.owner });
      assert.strictEqual(r[0].response, 'Sorry, $sender, but this song must be music category');
    });

    it(`Queue is empty`, async () => {
      const count = await getRepository(SongRequest).count();
      assert(count === 0);
    });
  });
});
