/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const variable = require('../../general.js').variable
const message = require('../../general.js').message
const assert = require('chai').assert

describe('systems/moderation - Emotes()', () => {
  const cEmotesEmojisAreEmotes = { message: '😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 😗 😙 😚 🙂 🤗 🤩 🤔 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 ☹️ 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 🤯 😬 😰 😱', sender: { username: 'testuser', badges: {}, emotes: [] }};

  describe('cEmotesEmojisAreEmotes=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      global.systems.moderation.cEmotesEmojisAreEmotes = false;
      await variable.isEqual('systems.moderation.cEmotesEmojisAreEmotes', false);
    })

    it(`message '${cEmotesEmojisAreEmotes.message}' should not timeout`, async () => {
      assert.isTrue(await global.systems.moderation.emotes({ sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message }));
    })
  })

  describe('cEmotesEmojisAreEmotes=true', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      global.systems.moderation.cEmotesEmojisAreEmotes = true;
      await variable.isEqual('systems.moderation.cEmotesEmojisAreEmotes', true);
    })

    it(`message '${cEmotesEmojisAreEmotes.message}' should timeout`, async () => {
      assert.isFalse(await global.systems.moderation.emotes({ sender: cEmotesEmojisAreEmotes.sender, message: cEmotesEmojisAreEmotes.message }));
    })
  })
})
