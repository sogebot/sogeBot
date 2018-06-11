/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

const tests = [
  {sender: owner, command: { after: '' }, shouldFail: true, error: 'systems.quotes.show.error.no-parameters'},
  {sender: owner, command: { after: '-id' }, shouldFail: true, error: 'systems.quotes.show.error.no-parameters'},
  {sender: owner, command: { after: '-tag' }, shouldFail: true, error: 'systems.quotes.show.error.no-parameters'},
  {sender: owner, command: { after: '-tag      -id     ' }, shouldFail: true, error: 'systems.quotes.show.error.no-parameters'},
  {sender: owner, command: { after: '-tag -id' }, shouldFail: true, error: 'systems.quotes.show.error.no-parameters'},
  {sender: owner, command: { after: '-id -tag' }, shouldFail: true, error: 'systems.quotes.show.error.no-parameters'},

  {sender: owner, command: { after: '-id a' }, shouldFail: true, error: 'systems.quotes.show.error.id-is-not-a-number'},

  {sender: owner, command: { after: '-id 1' }, id: 1, tag: 'general', shouldFail: false, exist: true},
  {sender: owner, command: { after: '-id 1 -tag' }, id: 1, tag: 'general', shouldFail: false, exist: true},
  {sender: owner, command: { after: '-id 2' }, id: 2, tag: 'general', shouldFail: false, exist: false},
  {sender: owner, command: { after: '-id 2 -tag' }, id: 2, tag: 'general', shouldFail: false, exist: false},

  {sender: owner, command: { after: '-tag lorem ipsum' }, id: 1, tag: 'lorem ipsum', shouldFail: false, exist: true},
  {sender: owner, command: { after: '-tag general' }, id: 1, tag: 'general', shouldFail: false, exist: false}
]

describe('Quotes - show()', () => {
  for (let test of tests) {
    describe(test.command.after, async () => {
      before(async () => {
        await db.cleanup()
        await message.prepare()
        await global.db.engine.insert('systems.quotes', { id: 1, tags: ['lorem ipsum'], quote: 'Lorem Ipsum', quotedBy: '12345' })
      })

      it('Run !quote show', async () => {
        global.systems.quotes.show({sender: test.sender, command: { after: test.command.after }})
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
            await message.isSent(['systems.quotes.set.error.not-found-by-id', 'systems.quotes.show.error.not-found-by-tag'], owner, { id: test.id, tag: test.tag })
          })
        }
      }
    })
  }
})
