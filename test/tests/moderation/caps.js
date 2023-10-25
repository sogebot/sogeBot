/* global describe it before */

import assert from 'assert';

import('../../general.js');
import moderation from '../../../dest/systems/moderation.js';
import { db } from '../../general.js';
import { variable } from '../../general.js';
import { message } from '../../general.js';
import { user } from '../../general.js';
import { time } from '../../general.js';

const emotesOffsetsKAPOW = new Map();
emotesOffsetsKAPOW.set('133537', ['7-11', '13-17']);

const tests = {
  'timeout': [
    { message: 'AAAAAAAAAAAAAAAAAAAAAA', sender: user.viewer },
    { message: 'ЙЦУЦЙУЙЦУЙЦУЙЦУЙЦУЙЦ', sender: user.viewer },
    { message: 'AAAAAAAAAAAAAaaaaaaaaaaaa', sender: user.viewer },
    { message: 'SomeMSG SomeMSG', sender: user.viewer },
  ],
  'ok': [
    { message: 'SomeMSG SomeMSg', sender: user.viewer },
    { message: '123123123213123123123123213123', sender: user.viewer },
    {
      message: 'zdarec KAPOW KAPOW', sender: user.viewer, emotesOffsets: emotesOffsetsKAPOW,
    },
    { message: '😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 😗 😙 😚 🙂 🤗 🤩 🤔 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 ☹️ 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 🤯 😬 😰 😱', sender: user.viewer },
  ],
};

describe('systems/moderation - Caps() - @func2', () => {
  describe('moderationCaps=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cCapsEnabled = false;
    });

    for (const test of tests.timeout) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert(await moderation.caps({ emotesOffsets: test.emotesOffsets ? test.emotesOffsets : new Map(), sender: test.sender, message: test.message }));
      });
    }

    for (const test of tests.ok) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert(await moderation.caps({ emotesOffsets: test.emotesOffsets ? test.emotesOffsets : new Map(), sender: test.sender, message: test.message }));
      });
    }
  });
  describe('moderationCaps=true', async () => {
    before(async () => {
      await message.prepare();
      moderation.cCapsEnabled = true;
    });

    for (const test of tests.timeout) {
      it(`message '${test.message}' should timeout`, async () => {
        assert(!(await moderation.caps({ emotesOffsets: test.emotesOffsets ? test.emotesOffsets : new Map(), sender: test.sender, message: test.message })));
      });
    }

    for (const test of tests.ok) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert(await moderation.caps({ emotesOffsets: test.emotesOffsets ? test.emotesOffsets : new Map(), sender: test.sender, message: test.message }));
      });
    }
  });
  describe('immune user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cCapsEnabled = true;
    });

    it(`'AAAAAAAAAAAAAAAAAAAAAA' should timeout`, async () => {
      assert(!(await moderation.caps({ emotesOffsets: new Map(), sender: user.viewer, message: 'AAAAAAAAAAAAAAAAAAAAAA' })));
    });

    it(`add user immunity`, async () => {
      const r = await moderation.immune({ parameters: `${user.viewer.userName} caps 5s` });
      assert(r[0].response === '$sender, user @__viewer__ have caps immunity for 5 seconds');
    });

    it(`'AAAAAAAAAAAAAAAAAAAAAA' should not timeout`, async () => {
      assert((await moderation.caps({ emotesOffsets: new Map(), sender: user.viewer, message: 'AAAAAAAAAAAAAAAAAAAAAA' })));
    });

    it(`wait 10 seconds`, async () => {
      await time.waitMs(10000);
    });

    it(`'AAAAAAAAAAAAAAAAAAAAAA' should timeout`, async () => {
      assert(!(await moderation.caps({ emotesOffsets: new Map(), sender: user.viewer, message: 'AAAAAAAAAAAAAAAAAAAAAA' })));
    });
  });
});
