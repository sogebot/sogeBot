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
  { sender: owner, parameters: '-id a', id: 'a', shouldFail: true, exist: false },
  { sender: owner, parameters: '-id cb286f64-833d-497f-b5d9-a2dbd7645147', id: 'cb286f64-833d-497f-b5d9-a2dbd7645147', shouldFail: false, exist: false },
  { sender: owner, parameters: '-id $id', id: 1, shouldFail: false, exist: true },
];

describe('Quotes - remove()', () => {
  for (const test of tests) {
    let responses = [];
    describe(test.parameters, async () => {
      let id = null;

      before(async () => {
        await db.cleanup();
        await message.prepare();
        const quote = await quotes.add({ sender: test.sender, parameters: '-tags lorem ipsum -quote Lorem Ipsum', command: '!quote add' });
        id = quote[0].id;
        if (test.id === 1) {
          test.id = id;
        }
      });

      it('Run !quote remove', async () => {
        responses = await quotes.remove({ sender: test.sender, parameters: test.parameters.replace('$id', id), command: '!quote remove' });
      });
      if (test.shouldFail) {
        it('Should throw error', async () => {
          assert.strictEqual(responses[0].response, '$sender, quote ID is missing.');
        });
        it('Database should not be empty', async () => {
          const items = await getManager()
            .createQueryBuilder()
            .select('quotes')
            .from(Quotes, 'quotes')
            .getMany();
          assert(items.length > 0);
        });
      } else {
        if (test.exist) {
          it('Should sent success message', async () => {
            assert.strictEqual(responses[0].response, `$sender, quote ${id} was successfully deleted.`)
          });
          it('Database should be empty', async () => {
            const items = await getManager()
              .createQueryBuilder()
              .select('quotes')
              .from(Quotes, 'quotes')
              .getMany();
            assert(items.length === 0);
          });
        } else {
          it('Should sent not-found message', async () => {
            assert.strictEqual(responses[0].response, `$sender, quote ${test.id} was not found.`);
          });
          it('Database should not be empty', async () => {
            const items = await getManager()
              .createQueryBuilder()
              .select('quotes')
              .from(Quotes, 'quotes')
              .getMany();
            assert(items.length > 0);
          });
        }
      }
    });
  }
});
