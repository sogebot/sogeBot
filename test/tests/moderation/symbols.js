/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const variable = require('../../general.js').variable;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const assert = require('assert');

const moderation = (require('../../../dest/systems/moderation')).default;

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
});
