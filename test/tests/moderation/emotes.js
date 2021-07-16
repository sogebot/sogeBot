/* global describe it before */

const assert = require('assert');

require('../../general.js');

const moderation = (require('../../../dest/systems/moderation')).default;
const db = require('../../general.js').db;
const variable = require('../../general.js').variable;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const time = require('../../general.js').time;

describe('systems/moderation - Emotes()', () => {
  const cEmotesEmojisAreEmotes = { message: '😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 😗 😙 😚 🙂 🤗 🤩 🤔 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 ☹️ 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 🤯 😬 😰 😱', sender: user.viewer };

  describe('cEmotesEmojisAreEmotes=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cEmotesEmojisAreEmotes = false;
    });

    it(`message '${cEmotesEmojisAreEmotes.message}' should not timeout`, async () => {
      assert(await moderation.emotes({ sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message }));
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
      assert(!(await moderation.emotes({ sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message })));
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
      assert(!(await moderation.emotes({ sender: user.viewer, message: cEmotesEmojisAreEmotes.message })));
    });

    it(`add user immunity`, async () => {
      const r = await moderation.immune({ parameters: `${user.viewer.username} emotes 5s` });
      assert(r[0].response === '$sender, user @__viewer__ have emotes immunity for 5 seconds');
    });

    it(`'${cEmotesEmojisAreEmotes.message}' should not timeout`, async () => {
      assert((await moderation.emotes({ sender: user.viewer, message: cEmotesEmojisAreEmotes.message })));
    });

    it(`wait 10 seconds`, async () => {
      await time.waitMs(10000);
    });

    it(`'${cEmotesEmojisAreEmotes.message}' should timeout`, async () => {
      assert(!(await moderation.emotes({ sender: user.viewer, message: cEmotesEmojisAreEmotes.message })));
    });
  });
});
