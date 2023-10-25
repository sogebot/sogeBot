/* global describe it before */

import assert from 'assert';

import('../../general.js');
import moderation from '../../../dest/systems/moderation.js';
import { db } from '../../general.js';
import { variable } from '../../general.js';
import { message } from '../../general.js';
import { user } from '../../general.js';
import { time } from '../../general.js';

describe('systems/moderation - Emotes() - @func2', () => {
  const cEmotesEmojisAreEmotes = { message: '😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 😗 😙 😚 🙂 🤗 🤩 🤔 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 ☹️ 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 🤯 😬 😰 😱', sender: user.viewer };

  describe('cEmotesEmojisAreEmotes=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cEmotesEmojisAreEmotes = false;
    });

    it(`message '${cEmotesEmojisAreEmotes.message}' should not timeout`, async () => {
      assert(await moderation.emotes({ emotesOffsets: new Map(), sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message }));
    });
  });

  describe('cEmotesEmojisAreEmotes=true', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cEmotesEmojisAreEmotes = true;
    });

    it(`message '${cEmotesEmojisAreEmotes.message}' should timeout`, async () => {
      assert(!(await moderation.emotes({ emotesOffsets: new Map(), sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message })));
    });
  });

  describe('immune user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cEmotesEmojisAreEmotes = true;
      moderation.cEmotesEnabled = true;
    });

    it(`'${cEmotesEmojisAreEmotes.message}' should timeout`, async () => {
      assert(!(await moderation.emotes({ emotesOffsets: new Map(), sender: user.viewer, message: cEmotesEmojisAreEmotes.message })));
    });

    it(`add user immunity`, async () => {
      const r = await moderation.immune({ parameters: `${user.viewer.userName} emotes 5s` });
      assert(r[0].response === '$sender, user @__viewer__ have emotes immunity for 5 seconds');
    });

    it(`'${cEmotesEmojisAreEmotes.message}' should not timeout`, async () => {
      assert((await moderation.emotes({ emotesOffsets: new Map(), sender: user.viewer, message: cEmotesEmojisAreEmotes.message })));
    });

    it(`wait 10 seconds`, async () => {
      await time.waitMs(10000);
    });

    it(`'${cEmotesEmojisAreEmotes.message}' should timeout`, async () => {
      assert(!(await moderation.emotes({ emotesOffsets: new Map(), sender: user.viewer, message: cEmotesEmojisAreEmotes.message })));
    });
  });
});
