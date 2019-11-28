/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const variable = require('../../general.js').variable;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const assert = require('chai').assert;

const moderation = (require('../../../dest/systems/moderation')).default;

describe('systems/moderation - Emotes()', () => {
  const cEmotesEmojisAreEmotes = { message: '😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 😗 😙 😚 🙂 🤗 🤩 🤔 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 ☹️ 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 🤯 😬 😰 😱', sender: user.viewer};

  describe('cEmotesEmojisAreEmotes=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cEmotesEmojisAreEmotes = false;
    });

    it(`message '${cEmotesEmojisAreEmotes.message}' should not timeout`, async () => {
      assert.isTrue(await moderation.emotes({ sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message }));
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
      assert.isFalse(await moderation.emotes({ sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message }));
    });
  });
});
