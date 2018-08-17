/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const variable = require('../../general.js').variable
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
      await (global.systems.moderation.settings.spam.enabled = false)
      await variable.isEqual('systems.moderation.settings.spam.enabled', false)
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.spam({sender: { username: 'testuser' }, message: test}))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.spam({sender: { username: 'testuser' }, message: test}))
      })
    }
  })
  describe('moderationSpam=true', async () => {
    before(async () => {
      await db.cleanup()
      await (global.systems.moderation.settings.spam.enabled = true)
      await variable.isEqual('systems.moderation.settings.spam.enabled', true)
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.spam({sender: { username: 'testuser' }, message: test}))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.spam({sender: { username: 'testuser' }, message: test}))
      })
    }
  })
})
