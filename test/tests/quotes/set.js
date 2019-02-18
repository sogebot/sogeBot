/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

const tests = [
  { sender: owner, parameters: '', shouldFail: true },
  { sender: owner, parameters: '-id', shouldFail: true },
  { sender: owner, parameters: '-id a', shouldFail: true },
  { sender: owner, parameters: '-id 1 -tag', shouldFail: true },

  { sender: owner, parameters: '-id 1 -tag ipsum, dolor', id: 1, tags: 'ipsum, dolor', shouldFail: false, exist: true },
  { sender: owner, parameters: '-tag ipsum, dolor -id 1', id: 1, tags: 'ipsum, dolor', shouldFail: false, exist: true },
  { sender: owner, parameters: '-id 2 -tag ipsum, dolor', id: 2, tags: 'ipsum, dolor', shouldFail: false, exist: false },
  { sender: owner, parameters: '-tag ipsum, dolor -id 2', id: 2, tags: 'ipsum, dolor', shouldFail: false, exist: false }
]

describe('Quotes - set()', () => {
  for (let test of tests) {
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()
        await global.db.engine.insert('systems.quotes', { id: 1, tags: ['lorem ipsum'], quote: 'Lorem Ipsum', quotedBy: '12345' })
      })

      it('Run !quote set', async () => {
        global.systems.quotes.set({ sender: test.sender, parameters: test.parameters, command: '!quote set' })
      })
      if (test.shouldFail) {
        it('Should throw error', async () => {
          await message.isSent('systems.quotes.set.error.no-parameters', owner, { command: '!quote set' })
        })
        it('Tags should not be changed', async () => {
          let item = await global.db.engine.findOne('systems.quotes', { id: 1 })
          assert.deepEqual(item.tags, ['lorem ipsum'])
        })
      } else {
        if (test.exist) {
          it('Should sent success message', async () => {
            await message.isSent('systems.quotes.set.ok', owner, { id: test.id, tags: test.tags })
          })
          it('Tags should be changed', async () => {
            let item = await global.db.engine.findOne('systems.quotes', { id: test.id })
            assert.deepEqual(item.tags, test.tags.split(',').map((o) => o.trim()))
          })
        } else {
          it('Should sent not-found message', async () => {
            await message.isSent('systems.quotes.set.error.not-found-by-id', owner, { id: test.id })
          })
          it('Quote should not be created', async () => {
            let item = await global.db.engine.findOne('systems.quotes', { id: test.id })
            assert.isEmpty(item)
          })
        }
      }
    })
  }
})
