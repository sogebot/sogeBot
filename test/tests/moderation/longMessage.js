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
    'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs',
  ],
  'ok': [
    'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0',
  ],
};

describe('systems/moderation - longMessage() - @func3', () => {
  describe('moderationLongMessage=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cLongMessageEnabled = false;
    });

    for (const test of tests.timeout) {
      it(`message '${test}' should not timeout`, async () => {
        assert(await moderation.longMessage({ sender: user.viewer, message: test }));
      });
    }

    for (const test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert(await moderation.longMessage({ sender: user.viewer, message: test }));
      });
    }
  });
  describe('moderationLongMessage=true', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cLongMessageEnabled = true;
    });

    for (const test of tests.timeout) {
      it(`message '${test}' should timeout`, async () => {
        assert(!(await moderation.longMessage({ sender: user.viewer, message: test })));
      });
    }

    for (const test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert(await moderation.longMessage({ sender: user.viewer, message: test }));
      });
    }
  });

  describe('immune user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cLongMessageEnabled = true;
    });

    it(`'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs' should timeout`, async () => {
      assert(!(await moderation.longMessage({ sender: user.viewer, message: 'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs' })));
    });

    it(`add user immunity`, async () => {
      const r = await moderation.immune({ parameters: `${user.viewer.userName} longmessage 5s` });
      assert(r[0].response === '$sender, user @__viewer__ have longmessage immunity for 5 seconds');
    });

    it(`'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs' should not timeout`, async () => {
      assert((await moderation.longMessage({ sender: user.viewer, message: 'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs' })));
    });

    it(`wait 10 seconds`, async () => {
      await time.waitMs(10000);
    });

    it(`'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs' should timeout`, async () => {
      assert(!(await moderation.longMessage({ sender: user.viewer, message: 'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs' })));
    });
  });
});
