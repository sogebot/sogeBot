
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';

import { User } from '../../../dest/database/entity/user.js';
import { Keyword } from '../../../dest/database/entity/keyword.js';
import { AppDataSource } from '../../../dest/database.js';

import keywords from '../../../dest/systems/keywords.js';

// users
const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__' };

function randomString() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}
function generateCommand(opts) {
  const k = opts.keyword ? '-k ' + opts.keyword : null;
  const r = opts.response ? '-r ' + opts.response : null;
  const rid = typeof opts.rid !== 'undefined' ? '-rId ' + opts.rid : null;
  return [k, r, rid].join(' ').trim();
}

const failedTests = [
  { keyword: null, response: null },
  { keyword: null, response: 'Lorem Ipsum' },
  { keyword: 'ahoj', response: null },
  { keyword: 'ahoj|nebo', response: null },
];

const successTests = [
  {
    keyword: 'test', response: '(!me)', actualResponse: '@__broadcaster__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 0 bits | 0 months',
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['This line will be triggered test'], '-triggers': [] },
    ],
  },
  {
    keyword: 'привет ты', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['This line will be triggered привет ты', 'привет ты?', ',привет ты', 'Hi how привет ты you'], '-triggers': ['This line wont be triggered'] },
    ],
  },
  {
    keyword: 'hello.*|hi', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['This line will be triggered hello', 'This line will be triggered hello?', 'Hi how are you'], '-triggers': ['This line wont be triggered'] },
    ],
  },
  {
    keyword: 'ahoj', response: randomString(), editResponse: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj', ',ahoj', 'ahoj?'], '-triggers': ['ahojda', 'sorry jako'] },
      { type: 'edit' },
      { type: 'run', afterEdit: true, triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj', ',ahoj', 'ahoj?'], '-triggers': ['ahojda', 'sorry jako'] },
    ],
  },
  {
    keyword: 'ahoj jak je', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj jak je'], '-triggers': ['ahoj', 'ahojda', 'jak je ahoj', 'sorry jako'] },
    ],
  },
  {
    keyword: 'ahoj|jak', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['ahojda', 'sorry jako'] },
    ],
  },
  {
    keyword: 'ahoj.*', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj'], '-triggers': ['sorry jako'] },
    ],
  },
  {
    keyword: 'ahoj.*|sorry jako', response: randomString(),
    tests: [
      { type: 'add' },
      { type: 'run', triggers: ['Lorem ipsum dolor sit amet nevim co dal psat ahoj jak je ty vole?', 'ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj', 'sorry jako'], '-triggers': [] },
      { type: 'toggle' },
      { type: 'run', triggers: [], '-triggers': ['Lorem ipsum dolor sit amet nevim co dal psat ahoj jak je ty vole?', 'ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj', 'sorry jako'] },
      { type: 'toggle' },
      { type: 'run', triggers: ['Lorem ipsum dolor sit amet nevim co dal psat ahoj jak je ty vole?', 'ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj', 'sorry jako'], '-triggers': [] },
      { type: 'remove' },
      { type: 'run', triggers: [], '-triggers': ['Lorem ipsum dolor sit amet nevim co dal psat ahoj jak je ty vole?', 'ahoj', 'ahojda', 'ahoj jak je', 'jak je ahoj', 'sorry jako'] },
    ],
  },
];


describe('Keywords - basic workflow (add, run, edit) - @func2', () => {
  describe('Expected parsed fail', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });
    for (const t of failedTests) {
      it(generateCommand(t), async () => {
        const r = await keywords.add({ sender: owner, parameters: generateCommand(t) });
        assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !keyword');
      });
    }
  });

  describe('Advanced tests', () => {
    for (const test of successTests) {
      describe(generateCommand(test), () => {
        before(async () => {
          await db.cleanup();
          await AppDataSource.getRepository(User).save(owner);
        });
        beforeEach(async () => {
          await message.prepare();
        });
        for (const t of test.tests) {
          switch (t.type) {
            case 'add':
              it ('add()', async () => {
                const r = await keywords.add({ sender: owner, parameters: generateCommand(test) });
                const k = await Keyword.findOneBy({ keyword: test.keyword });
                assert.strictEqual(r[0].response, `$sender, keyword ${test.keyword} (${k.id}) was added`);
              });
              break;
            case 'toggle':
              it ('toggle()', async () => {
                const k = await Keyword.findOneBy({ keyword: test.keyword });
                const r = await keywords.toggle({ sender: owner, parameters: generateCommand(test) });
                if (k.enabled) {
                  assert.strictEqual(r[0].response, `$sender, keyword ${test.keyword} was disabled`);
                } else {
                  assert.strictEqual(r[0].response, `$sender, keyword ${test.keyword} was enabled`);
                }
              });
              break;
            case 'remove':
              it ('remove()', async () => {
                const r = await keywords.remove({ sender: owner, parameters: generateCommand(test) });
                assert.strictEqual(r[0].response, `$sender, keyword ${test.keyword} was removed`);
              });
              break;
            case 'edit':
              it (`edit() | ${test.response} => ${test.editResponse}`, async () => {
                test.response = test.editResponse;
                const r = await keywords.edit({ sender: owner, parameters: generateCommand({...test, ...t, rid: 1}) });
                assert.strictEqual(r[0].response, `$sender, keyword ${test.keyword} is changed to '${test.response}'`);
              });
              break;
            case 'run':
              for (const r of t.triggers) {
                it (`run() | ${r} => ${t.afterEdit ? test.editResponse : test.response}`, async () => {
                  await keywords.run({ sender: owner, message: r });
                  await message.isSentRaw(t.afterEdit
                    ? test.editResponse
                    : (test.actualResponse
                      ? test.actualResponse
                      : test.response), owner);
                });
              }
              for (const r of t['-triggers']) {
                it (`run() | ${r} => <no response>`, async () => {
                  await keywords.run({ sender: owner, message: r });
                  await message.isNotSentRaw(t.afterEdit ? test.editResponse : test.response, owner);
                });
              }
              break;
            default:
              console.log('unknown: ' + t.type);
          }
        }
      });
    }
  });
});
