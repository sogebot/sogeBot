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
  { sender: owner, parameters: '-id 1', id: 1, shouldFail: false, exist: true },
  { sender: owner, parameters: '-id 2', id: 2, shouldFail: false, exist: false }
]

describe('Quotes - remove()', () => {
  for (let test of tests) {
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()
        await global.db.engine.insert('systems.quotes', { id: 1, tags: ['lorem ipsum'], quote: 'Lorem Ipsum', quotedBy: '12345' })
      })

      it('Run !quote remove', async () => {
        global.systems.quotes.remove({ sender: test.sender, parameters: test.parameters, command: '!quote remove' })
      })
      if (test.shouldFail) {
        it('Should throw error', async () => {
          await message.isSent('systems.quotes.remove.error', owner, { command: '!quote remove' })
        })
        it('Database should not be empty', async () => {
          let items = await global.db.engine.find('systems.quotes')
          assert.isNotEmpty(items)
        })
      } else {
        if (test.exist) {
          it('Should sent success message', async () => {
            await message.isSent('systems.quotes.remove.ok', owner, { id: test.id })
          })
          it('Database should be empty', async () => {
            let items = await global.db.engine.find('systems.quotes')
            assert.isEmpty(items)
          })
        } else {
          it('Should sent not-found message', async () => {
            await message.isSent('systems.quotes.remove.not-found', owner, { id: test.id })
          })
          it('Database should not be empty', async () => {
            let items = await global.db.engine.find('systems.quotes')
            assert.isNotEmpty(items)
          })
        }
      }
    })
  }
})
