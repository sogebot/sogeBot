/* global describe it before */

import assert from 'assert';

import('../../general.js');
import moderation from '../../../dest/systems/moderation.js';
import { db } from '../../general.js';
import { variable } from '../../general.js';
import { message } from '../../general.js';
import { user } from '../../general.js';
import { time } from '../../general.js';

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

describe('systems/moderation - symbols() - @func3', () => {
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
      const r = await moderation.immune({ parameters: `${user.viewer.userName} symbols 5s` });
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
