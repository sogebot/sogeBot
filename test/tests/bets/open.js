/* global describe it beforeEach */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert
const message = require('../../general.js').message
const _ = require('lodash')

// users
const owner = { username: 'soge__' }

const tests = {
  true: [
    {
      input: '-timeout 5 -title "Jak se umistim?" Vyhra | Top 3 | Top 10',
      title: 'Jak se umistim?',
      options: [
        { name: 'Vyhra' },
        { name: 'Top 3' },
        { name: 'Top 10' }
      ]
    },
    {
      input: '-timeout 5 -title "Vyhra / Prohra" Vyhra | Prohra',
      title: 'Vyhra / Prohra',
      options: [
        { name: 'Vyhra' },
        { name: 'Prohra' }
      ]
    }
  ]
}

describe('Bets - open()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  for (let [s, ta] of Object.entries(tests)) {
    for (let t of ta) {
      it((s ? 'OK' : 'NG') + ' - ' + t.input, async () => {
        await global.systems.bets.open({ sender: owner, parameters: t.input })

        const bets = await global.db.engine.find(global.systems.bets.collection.data, { key: 'bets' })

        assert.isTrue(bets.length === (s ? 1 : 0))
        assert.equal(bets[0].title, t.title)
        assert.isTrue(_.isEqual(bets[0].options, t.options),
          `\nExpected: ${JSON.stringify(t.options)}\nActual:   ${JSON.stringify(bets[0].options)}\n\t`)
      })
    }
  }
})
