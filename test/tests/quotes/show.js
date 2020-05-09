/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const quotes = (require('../../../dest/systems/quotes')).default;

// users
const owner = { username: 'soge__', userId: '1' };
const user = { username: 'user', userId: '3' };

const tests = [
  { sender: owner, parameters: '', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-id', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-tag', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-tag      -id     ', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-tag -id', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },
  { sender: owner, parameters: '-id -tag', shouldFail: true, error: 'systems.quotes.show.error.no-parameters' },

  { sender: owner, parameters: '-id $id', id: 1, tag: 'general', shouldFail: false, exist: true },
  { sender: owner, parameters: '-id $id -tag', id: 1, tag: 'general', shouldFail: false, exist: true },
  { sender: owner, parameters: '-id 99999', id: 99999, tag: 'general', shouldFail: false, exist: false },
  { sender: owner, parameters: '-id 99999 -tag', id: 99999, tag: 'general', shouldFail: false, exist: false },

  { sender: owner, parameters: '-tag lorem ipsum', id: 1, tag: 'lorem ipsum', shouldFail: false, exist: true },
  { sender: owner, parameters: '-tag general', id: 1, tag: 'general', shouldFail: false, exist: false },
];

describe('Quotes - main()', () => {
  for (const test of tests) {
    let id, r;
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
        await getRepository(User).save({ username: user.username, userId: user.userId });
        await getRepository(User).save({ username: owner.username, userId: owner.userId });
        const quote = await quotes.add({ sender: test.sender, parameters: '-tags lorem ipsum -quote Lorem Ipsum', command: '!quote add' });
        id = quote[0].id;
        if (test.id === 1) {
          test.id = id;
        }
        test.parameters = test.parameters.replace('$id', id);
      });

      it('Run !quote', async () => {
        r = await quotes.main({ sender: test.sender, parameters: test.parameters, command: '!quote' });
      });
      if (test.shouldFail) {
        it('Should throw error', async () => {
          assert.strictEqual(r[0].response, `$sender, !quote is missing -id or -tag.`);
        });
      } else {
        if (test.exist) {
          it('Should show quote', async () => {
            assert.strictEqual(r[0].response, `Quote ${id} by soge__ 'Lorem Ipsum'`);
          });
        } else {
          it('Should sent not-found message', async () => {
            assert(r[0].response === `$sender, no quotes with tag general was not found.` || r[0].response === `$sender, quote ${test.id} was not found.`);
          });
        }
      }
    });
  }
});
