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
    'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum',
    'Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum'
  ],
  'ok': [
    'Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum',
    'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum'
  ]
}

describe('systems/moderation - Spam()', () => {
  describe('moderationSpam=false', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
      global.systems.moderation.cSpamEnabled = false
      await variable.isEqual('systems.moderation.cSpamEnabled', false)
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.spam({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.spam({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }
  })
  describe('moderationSpam=true', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
      global.systems.moderation.cSpamEnabled = true
      await variable.isEqual('systems.moderation.cSpamEnabled', true)
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.spam({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.spam({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }
  })
})
