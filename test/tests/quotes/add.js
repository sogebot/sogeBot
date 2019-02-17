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
  { sender: owner, parameters: '-quote -tags', shouldFail: true },
  { sender: owner, parameters: '-quote         -tags             ', shouldFail: true },
  { sender: owner, parameters: '-quote -tags lorem ipsum', shouldFail: true },
  { sender: owner, parameters: '-tags -quote', shouldFail: true },
  { sender: owner, parameters: '-tags lorem ipsum -quote', shouldFail: true },
  { sender: owner, parameters: '-tags Lorem Ipsum Dolor', shouldFail: true },
  { sender: owner, parameters: '-quote Lorem Ipsum Dolor', quote: 'Lorem Ipsum Dolor', tags: 'general', shouldFail: false },
  { sender: owner, parameters: '-quote Lorem Ipsum Dolor -tags lorem', quote: 'Lorem Ipsum Dolor', tags: 'lorem', shouldFail: false },
  { sender: owner, parameters: '-quote Lorem Ipsum Dolor -tags lorem ipsum', quote: 'Lorem Ipsum Dolor', tags: 'lorem ipsum', shouldFail: false },
  { sender: owner, parameters: ' -tags lorem ipsum, dolor sit -quote Lorem Ipsum Dolor', quote: 'Lorem Ipsum Dolor', tags: 'lorem ipsum, dolor sit', shouldFail: false }
]

describe('Quotes - add()', () => {
  for (let test of tests) {
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()
      })

      it('Run !quote add', async () => {
        global.systems.quotes.add({ sender: test.sender, parameters: test.parameters, command: '!quote add' })
      })
      if (test.shouldFail) {
        it('Should throw error', async () => {
          await message.isSent('systems.quotes.add.error', owner, { command: '!quote add' })
        })
        it('Database should be empty', async () => {
          let items = await global.db.engine.find('systems.quotes')
          assert.isEmpty(items)
        })
      } else {
        it('Should sent success message', async () => {
          await message.isSent('systems.quotes.add.ok', owner, { tags: test.tags, quote: test.quote, id: 1 })
        })
        it('Database should contain new quote', async () => {
          let items = await global.db.engine.find('systems.quotes')
          assert.isNotEmpty(items)
        })
      }
    })
  }
})
