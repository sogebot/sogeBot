/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert

const tests = {
  'timeout': [
    'AAAAAAAAAAAAAAAAAAAAAA',
    'ЙЦУЦЙУЙЦУЙЦУЙЦУЙЦУЙЦ',
    'AAAAAAAAAAAAAaaaaaaaaaaaa'
  ],
  'ok': [
    '123123123213123123123123213123'
  ]
}

describe('systems/moderation - Caps()', () => {
  describe('moderationCaps=false', async () => {
    before(async () => {
      await db.cleanup()
      await global.db.engine.insert('settings', { key: 'moderationCaps', value: 'false' })
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps(global.systems.moderation, { username: 'testuser' }, test))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps(global.systems.moderation, { username: 'testuser' }, test))
      })
    }
  })
  describe('moderationCaps=true', async () => {
    before(async () => {
      await db.cleanup()
      await global.db.engine.insert('settings', { key: 'moderationCaps', value: 'true' })
    })

    for (let test of tests.timeout) {
      it(`message '${test}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.caps(global.systems.moderation, { username: 'testuser' }, test))
      })
    }

    for (let test of tests.ok) {
      it(`message '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.caps(global.systems.moderation, { username: 'testuser' }, test))
      })
    }
  })
  describe('#884 - message length - 15, max caps 80%, message: FrankerZ FrankerZ', async () => {
    before(async () => {
      await db.cleanup()
      await global.db.engine.insert('settings', { key: 'moderationCaps', value: 'true' })
      await global.db.engine.insert('settings', { key: 'moderationCapsMaxPercent', value: 80 })
      await global.db.engine.insert('settings', { key: 'moderationCapsTriggerLength', value: 15 })
    })

    it(`message 'FrankerZ FrankerZ' should not timeout`, async () => {
      assert.isTrue(await global.systems.moderation.caps(global.systems.moderation, { username: 'testuser' }, 'FrankerZ FrankerZ'))
    })
  })
})
