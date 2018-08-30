/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert

const tests = {
  'timeout': [
    '!@#$%^&*()(*&^%$#@#$%^&*)',
    '!@#$%^&*( one two (*&^%$#@#'
  ],
  'ok': [
    '!@#$%^&*( one two three four (*&^%$#@ one two three four #$%^&*)',
    '!@#$%^&*()(*&^'
  ]
}

describe('systems/moderation - symbols()', () => {
  describe('moderationSymbols=false', async () => {
    before(async () => {
      await db.cleanup()
      await (global.systems.moderation.settings.symbols.enabled = false)
    })

    for (let test of tests.timeout) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.symbols({ sender: { username: 'testuser' }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.symbols({ sender: { username: 'testuser' }, message: test }))
      })
    }
  })
  describe('moderationSymbols=true', async () => {
    before(async () => {
      await db.cleanup()
      await (global.systems.moderation.settings.symbols.enabled = true)
    })

    for (let test of tests.timeout) {
      it(`symbols '${test}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.symbols({ sender: { username: 'testuser' }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.symbols({ sender: { username: 'testuser' }, message: test }))
      })
    }
  })
})
