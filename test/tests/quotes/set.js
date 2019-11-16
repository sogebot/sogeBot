/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const assert = require('chai').assert;
const message = require('../../general.js').message;

const { getManager } = require('typeorm');
const { Quotes } = require('../../../dest/database/entity/quotes');

// users
const owner = { username: 'soge__', userId: 1 };

const tests = [
  { sender: owner, parameters: '', shouldFail: true },
  { sender: owner, parameters: '-id', shouldFail: true },
  { sender: owner, parameters: '-id a', shouldFail: true },
  { sender: owner, parameters: '-id $id -tag', shouldFail: true },

  { sender: owner, parameters: '-id $id -tag ipsum, dolor', id: 1, tags: 'ipsum, dolor', shouldFail: false, exist: true },
  { sender: owner, parameters: '-tag ipsum, dolor -id $id', id: 1, tags: 'ipsum, dolor', shouldFail: false, exist: true },
  { sender: owner, parameters: '-id ca0cfbe4-2cc2-449b-8b9d-67bb34b21701 -tag ipsum, dolor', id: 'ca0cfbe4-2cc2-449b-8b9d-67bb34b21701', tags: 'ipsum, dolor', shouldFail: false, exist: false },
  { sender: owner, parameters: '-tag ipsum, dolor -id ca0cfbe4-2cc2-449b-8b9d-67bb34b21701', id: 'ca0cfbe4-2cc2-449b-8b9d-67bb34b21701', tags: 'ipsum, dolor', shouldFail: false, exist: false },
];

describe('Quotes - set()', () => {
  for (const test of tests) {
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
        const quote = await global.systems.quotes.add({ sender: test.sender, parameters: '-tags lorem ipsum -quote Lorem Ipsum', command: '!quote add' });
        id = quote.id;
        if (test.id === 1) {
          test.id = id;
        }
        test.parameters = test.parameters.replace('$id', id);
      });

      it('Run !quote set', async () => {
        global.systems.quotes.set({ sender: test.sender, parameters: test.parameters, command: '!quote set' });
      });
      if (test.shouldFail) {
        it('Should throw error', async () => {
          await message.isSent('systems.quotes.set.error.no-parameters', owner, { command: '!quote set' });
        });
      } else {
        if (test.exist) {
          it('Should sent success message', async () => {
            await message.isSent('systems.quotes.set.ok', owner, { id: test.id, tags: test.tags });
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
            await message.isSent('systems.quotes.set.error.not-found-by-id', owner, { id: test.id });
          });
          it('Quote should not be created', async () => {
            const item = await getManager()
              .createQueryBuilder()
              .select('quote')
              .from(Quotes, 'quote')
              .where('id = :id', { id: test.id })
              .getOne();
            assert.isUndefined(item);
          });
        }
      }
    });
  }
});
