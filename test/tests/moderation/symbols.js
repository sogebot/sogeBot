/* global describe it before */

const assert = require('assert');

require('../../general.js');

const moderation = (require('../../../dest/systems/moderation')).default;
const db = require('../../general.js').db;
const variable = require('../../general.js').variable;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const time = require('../../general.js').time;

const tests = {
  'timeout': [
    '!@#$%^&*()(*&^%$#@#$%^&*)',
    '!@#$%^&*( one two (*&^%$#@#',
  ],
  'ok': [
    '!@#$%^&*( one two three four (*&^%$#@ one two three four #$%^&*)',
    '!@#$%^&*()(*&^',
  ],
};

describe('systems/moderation - symbols()', () => {
  describe('moderationSymbols=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cSymbolsEnabled = false;
    });

    for (const test of tests.timeout) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert(await moderation.symbols({ sender: user.viewer, message: test }));
      });
    }

    for (const test of tests.ok) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert(await moderation.symbols({ sender: user.viewer, message: test }));
      });
    }
  });
  describe('moderationSymbols=true', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cSymbolsEnabled = true;
    });

    for (const test of tests.timeout) {
      it(`symbols '${test}' should timeout`, async () => {
        assert(!(await moderation.symbols({ sender: user.viewer, message: test })));
      });
    }

    for (const test of tests.ok) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert(await moderation.symbols({ sender: user.viewer, message: test }));
      });
    }
  });

  describe('immune user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cSymbolsEnabled = true;
    });

    it(`'!@#$%^&*()(*&^%$#@#$%^&*)' should timeout`, async () => {
      assert(!(await moderation.symbols({ sender: user.viewer, message: '!@#$%^&*()(*&^%$#@#$%^&*)' })));
    });

    it(`add user immunity`, async () => {
      const r = await moderation.immune({ parameters: `${user.viewer.username} symbols 5s` });
      assert(r[0].response === '$sender, user @__viewer__ have symbols immunity for 5 seconds');
    });

    it(`'!@#$%^&*()(*&^%$#@#$%^&*)' should not timeout`, async () => {
      assert((await moderation.symbols({ sender: user.viewer, message: '!@#$%^&*()(*&^%$#@#$%^&*)' })));
    });

    it(`wait 10 seconds`, async () => {
      await time.waitMs(10000);
    });

    it(`'!@#$%^&*()(*&^%$#@#$%^&*)' should timeout`, async () => {
      assert(!(await moderation.symbols({ sender: user.viewer, message: '!@#$%^&*()(*&^%$#@#$%^&*)' })));
    });
  });
});
