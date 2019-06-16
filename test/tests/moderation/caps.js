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

const tests = {
  'timeout': [
    { message: 'AAAAAAAAAAAAAAAAAAAAAA', sender: { username: 'testuser', badges: {}, emotes: [] } },
    { message: 'ЙЦУЦЙУЙЦУЙЦУЙЦУЙЦУЙЦ', sender: { username: 'testuser', badges: {}, emotes: [] } },
    { message: 'AAAAAAAAAAAAAaaaaaaaaaaaa', sender: { username: 'testuser', badges: {}, emotes: [] } },
    { message: 'SomeMSG SomeMSG', sender: { username: 'testuser', badges: {}, emotes: [] } }
  ],
  'ok': [
    { message: 'SomeMSG SomeMSg', sender: { username: 'testuser', badges: {}, emotes: [] } },
    { message: '123123123213123123123123213123', sender: { username: 'testuser', badges: {}, emotes: [] } },
    { message: 'zdarec KAPOW KAPOW', sender: { username: 'testuser', badges: {}, emotes: [{ id: '133537', start: 7, end: 11 }, { id: '133537', start: 13, end: 17 }] } }
  ]
}

describe('systems/moderation - Caps()', () => {
  describe('moderationCaps=false', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
      global.systems.moderation.cCapsEnabled = false
      await variable.isEqual('global.systems.moderation.cCapsEnabled', false)
    })

    for (let test of tests.timeout) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps({ sender: test.sender, message: test.message }))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps({ sender: test.sender, message: test.message }))
      })
    }
  })
  describe('moderationCaps=true', async () => {
    before(async () => {
            await message.prepare()
            await message.prepare()
      global.systems.moderation.cCapsEnabled = true
      await variable.isEqual('global.systems.moderation.cCapsEnabled', true)
    })

    for (let test of tests.timeout) {
      it(`message '${test.message}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.caps({ sender: test.sender, message: test.message }))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test.message}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps({ sender: test.sender, message: test.message }))
      })
    }
  })
})
