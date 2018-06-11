/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const assert = require('chai').assert
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

const tests = [
  {sender: owner, command: { after: '' }, shouldFail: true},
  {sender: owner, command: { after: '-id' }, shouldFail: true},
  {sender: owner, command: { after: '-id a' }, shouldFail: true},
  {sender: owner, command: { after: '-id 1' }, id: 1, shouldFail: false, exist: true},
  {sender: owner, command: { after: '-id 2' }, id: 2, shouldFail: false, exist: false}
]

describe('Quotes - remove()', () => {
  for (let test of tests) {
    describe(test.command.after, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()
        await global.db.engine.insert('systems.quotes', { id: 1, tags: ['lorem ipsum'], quote: 'Lorem Ipsum', quotedBy: '12345' })
      })

      it('Run !quote remove', async () => {
        global.systems.quotes.remove({sender: test.sender, command: { after: test.command.after }})
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
