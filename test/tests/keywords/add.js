/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}
function generateCommand(opts) {
  const k = opts.keyword ? '-k ' + opts.keyword : null;
  const r = opts.response ? '-r ' + opts.response : null;
  return [k, r].join(' ');
}

const failedTests = [
  { keyword: null, response: null },
  { keyword: null, response: 'Lorem Ipsum' },
  { keyword: 'ahoj', response: null },
  { keyword: 'ahoj|nebo', response: null },
]

const successTests = [
  { keyword: 'ahoj', response: randomString(), triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['ahojda', 'sorry jako'] },
  { keyword: 'ahoj jak je', response: randomString(), triggers: ['ahoj', 'ahoj jak je'], '-triggers': ['ahojda', 'jak je ahoj', 'sorry jako'] },
  { keyword: 'ahoj|jak', response: randomString(), triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['ahojda', 'sorry jako'] },
  { keyword: 'ahoj.*', response: randomString(), triggers: ['ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['sorry jako'] },
  { keyword: 'ahoj.*|sorry jako', response: randomString(), triggers: ['ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj', 'sorry jako'], '-triggers': [] },
]


describe('Keywords - add()', () => {
  beforeEach(async () => {
    await db.cleanup()
    await message.prepare()
  })

  describe('Expected parsed fail', () => {
    for (const t of failedTests) {
      it(generateCommand(t), async () => {
        global.systems.keywords.add({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('keywords.keyword-parse-failed', owner, { sender: owner.username })
      })
    }
  })

  describe('Expected to pass', () => {
    for (const t of successTests) {
      it(generateCommand(t), async () => {
        global.systems.keywords.add({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('keywords.keyword-was-added', owner, { keyword: t.keyword, response: t.response, sender: owner.username })
      })
    }
  })
})
