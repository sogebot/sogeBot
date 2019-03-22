/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const assert = require('assert');

// users
const owner = { username: 'soge__' }

function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}
function generateCommand(opts) {
  const k = opts.keyword ? '-k ' + opts.keyword : null;
  const r = opts.response ? '-r ' + opts.response : null;
  return [k, r].join(' ').trim();
}

const failedTests = [
  { keyword: null, response: null },
  { keyword: null, response: 'Lorem Ipsum' },
  { keyword: 'ahoj', response: null },
  { keyword: 'ahoj|nebo', response: null },
]

const successTests = [
  {
    keyword: 'ahoj', response: randomString(), editResponse: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['ahojda', 'sorry jako'] },
      { type: 'edit' },
      { type: 'run', afterEdit: true, triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['ahojda', 'sorry jako'] },
    ]
  },
  {
    keyword: 'ahoj jak je', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj jak je'], '-triggers': ['ahoj', 'ahojda', 'jak je ahoj', 'sorry jako'] },
    ]
  },
  {
    keyword: 'ahoj|jak', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['ahojda', 'sorry jako'] },
    ]
  },
  {
    keyword: 'ahoj.*', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['sorry jako'] },
    ]
  },
  {
    keyword: 'ahoj.*|sorry jako', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['Lorem ipsum dolor sit amet nevim co dal psat ahoj jak je ty vole?', 'ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj', 'sorry jako'], '-triggers': [] },
    ]
  },
]


describe('Keywords - basic worflow (add, run, edit)', () => {
  describe('Expected parsed fail', () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()
    })
    for (const t of failedTests) {
      it(generateCommand(t), async () => {
        global.systems.keywords.add({ sender: owner, parameters: generateCommand(t) })
        await message.isSent('keywords.keyword-parse-failed', owner, { sender: owner.username })
      })
    }
  })

  describe('Advanced tests', () => {
    before(async () => {
      await db.cleanup();
    })
    for (let test of successTests) {
      describe(generateCommand(test), () => {
        beforeEach(async () => {
          await message.prepare();
        })
        for (let t of test.tests) {
          switch (t.type) {
            case 'add':
              it ('add()', async () => {
                const k = await global.systems.keywords.add({ sender: owner, parameters: generateCommand(test) })
                assert.notStrictEqual(k, null, 'Keywords was not correctly created');
                await message.isSent('keywords.keyword-was-added', owner, { id: k.id, keyword: test.keyword, response: test.response, sender: owner.username })
              })
              break;
            case 'edit':
              it (`edit() | ${test.response} => ${test.editResponse}`, async () => {
                test.response = test.editResponse;
                const k = await global.systems.keywords.edit({ sender: owner, parameters: generateCommand({...test, ...t}) })
                assert.notStrictEqual(k, null, 'Keywords was not correctly edited');
                await message.isSent('keywords.keyword-was-edited', owner, { id: k.id, keyword: test.keyword, response: test.response, sender: owner.username })
              })
              break;
            case 'run':
              for (const r of t.triggers) {
                it (`run() | ${r} => ${t.afterEdit ? test.editResponse : test.response}`, async () => {
                  await global.systems.keywords.run({ sender: owner, message: r });
                  await message.isSentRaw(t.afterEdit ? test.editResponse : test.response, owner)
                })
              }
              for (const r of t['-triggers']) {
                it (`run() | ${r} => <no response>`, async () => {
                  await global.systems.keywords.run({ sender: owner, message: r });
                  await message.isNotSentRaw(t.afterEdit ? test.editResponse : test.response, owner)
                })
              }
              break;
            default:
              console.log('unknown: ' + t.type);
          }
        }
      })
    }
  })
})
