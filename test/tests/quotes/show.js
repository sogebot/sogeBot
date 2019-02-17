/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

const tests = [
  { sender: owner, parameters: '', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-id', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-tag', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-tag      -id     ', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-tag -id', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-id -tag', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },

  { sender: owner, parameters: '-id a', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },

  { sender: owner, parameters: '-id 1', id: 1, tag: 'general', shouldFail: false, exist: true },
  { sender: owner, parameters: '-id 1 -tag', id: 1, tag: 'general', shouldFail: false, exist: true },
  { sender: owner, parameters: '-id 2', id: 2, tag: 'general', shouldFail: false, exist: false },
  { sender: owner, parameters: '-id 2 -tag', id: 2, tag: 'general', shouldFail: false, exist: false },

  { sender: owner, parameters: '-tag lorem ipsum', id: 1, tag: 'lorem ipsum', shouldFail: false, exist: true },
  { sender: owner, parameters: '-tag general', id: 1, tag: 'general', shouldFail: false, exist: false }
]

describe('Quotes - main()', () => {
  for (let test of tests) {
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()
        await global.db.engine.insert('systems.quotes', { id: 1, tags: ['lorem ipsum'], quote: 'Lorem Ipsum', quotedBy: '12345' })
      })

      it('Run !quote', async () => {
        global.systems.quotes.main({ sender: test.sender, parameters: test.parameters, command: '!quote' })
      })
      if (test.shouldFail) {
        it('Should throw error', async () => {
          await message.isSent(test.error, owner, { command: '!quote' })
        })
      } else {
        if (test.exist) {
          it('Should show quote', async () => {
            await message.isSent('systems.quotes.show.ok', owner, { id: 1, quotedBy: 'undefined', quote: 'Lorem Ipsum' })
          })
        } else {
          it('Should sent not-found message', async () => {
            await message.isSent(['systems.quotes.show.error.not-found-by-id', 'systems.quotes.show.error.not-found-by-tag'], owner, { id: test.id, tag: test.tag })
          })
        }
      }
    })
  }
})
