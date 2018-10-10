/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

const assert = require('assert')

describe('lib/commons - compactDb()', () => {
  var expected = 0

  before(async () => {
    await db.cleanup()
    await message.prepare()
  })

  it('add random values to db to compact', async () => {
    for (let i = 0; i < 100; i++) {
      const value = (Math.floor(Math.random() * Math.floor(1000))) - 500
      expected += value
      await global.db.engine.insert('compact', { id: '1', value })
    }
  })

  it('run compact on db', async () => {
    await global.commons.compactDb({ table: 'compact', index: 'id', values: 'value' })
  })

  it('expecting correct compact value', async () => {
    let item = await global.db.engine.findOne('compact', { id: '1' })
    assert.strict.equal(item.value, expected)
  })
})
