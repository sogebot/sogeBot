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
      await message.prepare()
      global.systems.moderation.cSymbolsEnabled = false
      await variable.isEqual('systems.moderation.cSymbolsEnabled', false)
    })

    for (let test of tests.timeout) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.symbols({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.symbols({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }
  })
  describe('moderationSymbols=true', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
      global.systems.moderation.cSymbolsEnabled = true
      await variable.isEqual('systems.moderation.cSymbolsEnabled', true)
    })

    for (let test of tests.timeout) {
      it(`symbols '${test}' should timeout`, async () => {
        assert.isFalse(await global.systems.moderation.symbols({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }

    for (let test of tests.ok) {
      it(`symbols '${test}' should not timeout`, async () => {
        assert.isTrue(await global.systems.moderation.symbols({ sender: { username: 'testuser', badges: {} }, message: test }))
      })
    }
  })
})
