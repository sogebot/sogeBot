/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert

const tests = {
  'timeout': [
    { message: 'AAAAAAAAAAAAAAAAAAAAAA', sender: { username: 'testuser', emotes: [] } },
    { message: 'ЙЦУЦЙУЙЦУЙЦУЙЦУЙЦУЙЦ', sender: { username: 'testuser', emotes: [] } },
    { message: 'AAAAAAAAAAAAAaaaaaaaaaaaa', sender: { username: 'testuser', emotes: [] } },
    { message: 'SomeMSG SomeMSG', sender: { username: 'testuser', emotes: [] } }
  ],
  'ok': [
    { message: 'SomeMSG SomeMSg', sender: { username: 'testuser', emotes: [] } },
    { message: '123123123213123123123123213123', sender: { username: 'testuser', emotes: [] } },
    { message: 'zdarec KAPOW KAPOW', sender: { username: 'testuser', emotes: [{ id: '133537', start: 7, end: 11 }, { id: '133537', start: 13, end: 17 }] } }
  ]
}

describe('systems/moderation - Caps()', () => {
  describe('moderationCaps=false', async () => {
    before(async () => {
      await db.cleanup()
      await (global.systems.moderation.settings.caps.enabled = false)
    })

    for (let test of tests.timeout) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps({sender: test.sender, message: test.message}))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps({sender: test.sender, message: test.message}))
      })
    }
  })
  describe('moderationCaps=true', async () => {
    before(async () => {
      await db.cleanup()
      await global.db.engine.insert('settings', { key: 'moderationCaps', value: 'true' })
    })

    for (let test of tests.timeout) {
      it(`message '${test.message}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.caps({sender: test.sender, message: test.message}))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps({sender: test.sender, message: test.message}))
      })
    }
  })
})
