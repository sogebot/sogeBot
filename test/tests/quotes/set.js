/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const assert = require('assert');
const message = require('../../general.js').message;

const { getManager } = require('typeorm');
const { Quotes } = require('../../../dest/database/entity/quotes');

const quotes = (require('../../../dest/systems/quotes')).default;

// users
const owner = { username: 'soge__', userId: 1 };

const tests = [
  { sender: owner, parameters: '', shouldFail: true },
  { sender: owner, parameters: '-id', shouldFail: true },
  { sender: owner, parameters: '-id a', shouldFail: true },
  { sender: owner, parameters: '-id $id -tag', shouldFail: true },

  { sender: owner, parameters: '-id $id -tag ipsum, dolor', id: 1, tags: 'ipsum, dolor', shouldFail: false, exist: true },
  { sender: owner, parameters: '-tag ipsum, dolor -id $id', id: 1, tags: 'ipsum, dolor', shouldFail: false, exist: true },
  { sender: owner, parameters: '-id 99999 -tag ipsum, dolor', id: 99999, tags: 'ipsum, dolor', shouldFail: false, exist: false },
  { sender: owner, parameters: '-tag ipsum, dolor -id 99999', id: 99999, tags: 'ipsum, dolor', shouldFail: false, exist: false },
];

describe('Quotes - set()', () => {
  for (const test of tests) {
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
        const quote = await quotes.add({ sender: test.sender, parameters: '-tags lorem ipsum -quote Lorem Ipsum', command: '!quote add' });
        id = quote[0].id;
        if (test.id === 1) {
          test.id = id;
        }
        test.parameters = test.parameters.replace('$id', id);
      });

      let responses = '';
      it('Run !quote set', async () => {
        responses = await quotes.set({ sender: test.sender, parameters: test.parameters, command: '!quote set' });
      });
      if (test.shouldFail) {
        it('Should throw error', async () => {
          assert.strictEqual(responses[0].response, '$sender, !quote set is missing -id or -tag.');
        });
      } else {
        if (test.exist) {
          it('Should sent success message', async () => {
            assert.strictEqual(responses[0].response, `$sender, quote ${id} tags were set. (tags: ${test.tags})`);
          });
          it('Tags should be changed', async () => {
            const item = await getManager()
              .createQueryBuilder()
              .select('quote')
              .from(Quotes, 'quote')
              .where('id = :id', { id: test.id })
              .getOne();
            assert.deepEqual(item.tags, test.tags.split(',').map((o) => o.trim()));
          });
        } else {
          it('Should sent not-found message', async () => {
            assert.strictEqual(responses[0].response, `$sender, quote ${test.id} was not found.`);
          });
          it('Quote should not be created', async () => {
            const item = await getManager()
              .createQueryBuilder()
              .select('quote')
              .from(Quotes, 'quote')
              .where('id = :id', { id: test.id })
              .getOne();
            assert(typeof item === 'undefined');
          });
        }
      }
    });
  }
});
