/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const assert = require('assert');

// users
const owner = { username: 'soge__' }

function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}


describe('Keywords - listing', () => {
  describe('Listing without any keywords', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    })

    it('Expecting empty list', async () => {
      await global.systems.keywords.list({ sender: owner, parameters: '' });
      await message.isSent('keywords.list-is-empty', owner)
    })
  })

  describe('Listing with keywords', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    })

    let keywords = []

    for (let i = 0; i < 10; i++) {
      it ('Creating random keyword', async () => {
        const keyword = randomString();
        const response = randomString();
        const enabled = Math.random() >= 0.5;
        const k = await global.systems.keywords.add({ sender: owner, parameters: `-k ${keyword} -r ${response}` })
        assert.notStrictEqual(k, null);

        keywords.push({ id: k.id, keyword, response, enabled })
        await global.db.engine.update(global.systems.keywords.collection.data, { id: k.id }, { enabled })
      })
    }

    it('Expecting populated list', async () => {
      await global.systems.keywords.list({ sender: owner, parameters: '' });
      await message.isSent('keywords.list-is-not-empty', owner)

      for(k of keywords) {
        await message.isSentRaw(`${k.enabled ? '🗹' : '☐'} ${k.id} | ${k.keyword} | ${k.response}`, owner)
      }
    })
  })
})
