/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const tmi = require('../../general.js').tmi

const _ = require('lodash')
const assert = require('chai').assert

describe('lib/twitch - when()', () => {
  before(async () => {
    await tmi.waitForConnection()
    global.commons.sendMessage.reset()
    await db.cleanup()
  })

  it('when should not be in db', async () => {
    let when = await global.db.engine.find('cache.when')
    assert.lengthOf(when, 0, JSON.stringify(when))
  })

  it('await when() x-times at once', async () => {
    let toAwait = []
    for (let i = 0; i < 20; i++) {
      toAwait.push(global.twitch.when({
        online: null,
        offline: _.now()
      }))
    }
    await Promise.all(toAwait)
  })

  it('when should be only once in db', async () => {
    let when = await global.db.engine.find('cache.when')
    assert.lengthOf(when, 1, JSON.stringify(when))
  })
})
