/* global describe it before */
const assert = require('assert');

const _ = require('lodash');
require('../../general.js');

const alias = (require('../../../dest/systems/alias')).default;
const moderation = (require('../../../dest/systems/moderation')).default;
const songs = (require('../../../dest/systems/songs')).default;
const message = require('../../general.js').message;
const db = require('../../general.js').db;

// users
const owner = { username: '__broadcaster__' };

const tests = {
  'domain:prtzl.io': {
    'should.return.changed': [
      'Now Playing: Eden (Waveshaper Remix) - Instrumental by Scandroid -> https://prtzl.io/QbHKjGenxvZg49uG',
    ],
    'should.return.same': [
    ],
  },
  'osu.ppy.sh': {
    'should.return.changed': [
      'Lorem Ipsum osu.ppy.sh dolor sit amet',
    ],
    'should.return.same': [
      'Lorem Ipsum http://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh dolor sit amet',
    ],
  },
  '(https?:\\/\\/)?osu.ppy.sh(*)?': {
    'should.return.changed': [
      'Lorem Ipsum osu.ppy.sh dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/p/2131231231 dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/beatmapsets/59670/#osu/1263997 dolor sit amet',
      'https://osu.ppy.sh/beatmapsets/554084#osu/1173113',
    ],
    'should.return.same': [
    ],
  },
  '(https?:\\/\\/)?(www\\.)?osu.ppy.sh(*)?': {
    'should.return.changed': [
      'Lorem Ipsum osu.ppy.sh dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/p/2131231231 dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/beatmapsets/59670/#osu/1263997 dolor sit amet',
      'https://osu.ppy.sh/beatmapsets/554084#osu/1173113',
    ],
    'should.return.same': [
    ],
  },
  'domain:osu.ppy.sh': {
    'should.return.changed': [
      'Lorem Ipsum osu.ppy.sh dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/p/2131231231 dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/beatmapsets/59670/#osu/1263997 dolor sit amet',
      'https://osu.ppy.sh/beatmapsets/554084#osu/1173113',
    ],
    'should.return.same': [
    ],
  },
  'domain:ppy.sh': {
    'should.return.changed': [
      'Lorem Ipsum osu.ppy.sh dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/p/2131231231 dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/beatmapsets/59670/#osu/1263997 dolor sit amet',
      'https://osu.ppy.sh/beatmapsets/554084#osu/1173113',
    ],
    'should.return.same': [
    ],
  },
  'testForSongRequest': {
    'should.return.changed': [
      '!songrequest https://youtu.be/HmZYgqBp1gI',
      '!sr https://youtu.be/HmZYgqBp1gI',
    ],
  },
  'test': {
    'should.return.changed': [
      'test', 'a test', 'test a', 'a test a', '?test', 'test?',
    ],
    'should.return.same': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어',
    ],
  },
  '*test': {
    'should.return.changed': [
      'test', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'a test', 'test a',
    ],
    'should.return.same': [
      'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어',
    ],
  },
  'test*': {
    'should.return.changed': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어',
    ],
    'should.return.same': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
  },
  '*test*': {
    'should.return.same': [
      'abc',
    ],
    'should.return.changed': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
  },
  '+test': {
    'should.return.changed': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test',
    ],
    'should.return.same': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어',
    ],
  },
  'test+': {
    'should.return.changed': [
      'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어',
    ],
    'should.return.same': [
      'test', 'a test', 'test a', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
  },
  '+test+': {
    'should.return.same': [
      'test', 'abc', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test',
    ],
    'should.return.changed': [
      'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
  },
  '*test+': {
    'should.return.same': [
      'test', 'abc', 'a test', 'test a', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test',
    ],
    'should.return.changed': [
      'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
  },
  '+test*': {
    'should.return.same': [
      'test', 'abc', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어',
    ],
    'should.return.changed': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
  },
};

describe('systems/moderation - whitelist()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    const r = await alias.add({ sender: owner, parameters: '-a !sr -c !songrequest' });
    assert.strictEqual(r[0].response, '$sender, alias !sr for !songrequest was added');
    await songs.setCommand('!songrequest', '!songrequest');
  });

  for (const [pattern, test] of Object.entries(tests)) {
    for (const text of _.get(test, 'should.return.changed', [])) {
      it(`pattern '${pattern}' should change '${text}'`, async () => {
        moderation.cListsWhitelist = [pattern];
        const result = await moderation.whitelist(text, '0efd7b1c-e460-4167-8e06-8aaf2c170311');
        assert(text !== result);
      });
    }
    for (const text of _.get(test, 'should.return.same', [])) {
      it(`pattern '${pattern}' should not change '${text}'`, async () => {
        moderation.cListsWhitelist = [pattern];
        const result = await moderation.whitelist(text, '0efd7b1c-e460-4167-8e06-8aaf2c170311');
        assert(text === result);
      });
    }
  }

  describe(`#2392 - changed !songrequest => !zahrej should be whitelisted`, () => {
    after(async () => {
      await songs.setCommand('!songrequest', '!songrequest');
    });

    it('change command from !songrequest => !zahrej', async () => {
      await songs.setCommand('!songrequest', '!zahrej');
    });

    it('!zahrej command should be whitelisted', async () => {
      const text = '!zahrej https://youtu.be/HmZYgqBp1gI';
      const result = await moderation.whitelist(text, '0efd7b1c-e460-4167-8e06-8aaf2c170311');
      assert(text !== result);
    });
  });
});
