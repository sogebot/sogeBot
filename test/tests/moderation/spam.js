/* global describe it before */

import assert from 'assert';

import('../../general.js');
import moderation from '../../../dest/systems/moderation.js';
import { db } from '../../general.js';
import { variable } from '../../general.js';
import { message } from '../../general.js';
import { time } from '../../general.js';
import { user } from '../../general.js';

const tests = {
  'timeout': [
    'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum',
    'Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum',
  ],
  'ok': [
    'Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum',
    'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum',
  ],
};

describe('systems/moderation - Spam() - @func2', () => {
  describe('moderationSpam=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cSpamEnabled = false;
    });

    for (const test of tests.timeout) {
      it(`message '${test}' should not timeout`, async () => {
        assert(await moderation.spam({ sender: user.viewer, message: test }));
      });
    }

    for (const test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert(await moderation.spam({ sender: user.viewer, message: test }));
      });
    }
  });
  describe('moderationSpam=true', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cSpamEnabled = true;
    });

    for (const test of tests.timeout) {
      it(`message '${test}' should timeout`, async () => {
        assert(!(await moderation.spam({ sender: user.viewer, message: test })));
      });
    }

    for (const test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert(await moderation.spam({ sender: user.viewer, message: test }));
      });
    }
  });

  describe('immune user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cSpamEnabled = true;
    });

    it(`'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum' should timeout`, async () => {
      assert(!(await moderation.spam({ sender: user.viewer, message: 'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum' })));
    });

    it(`add user immunity`, async () => {
      const r = await moderation.immune({ parameters: `${user.viewer.userName} spam 5s` });
      assert(r[0].response === '$sender, user @__viewer__ have spam immunity for 5 seconds');
    });

    it(`'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum' should not timeout`, async () => {
      assert((await moderation.spam({ sender: user.viewer, message: 'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum' })));
    });

    it(`wait 10 seconds`, async () => {
      await time.waitMs(10000);
    });

    it(`'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum' should timeout`, async () => {
      assert(!(await moderation.spam({ sender: user.viewer, message: 'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum' })));
    });
  });
});
