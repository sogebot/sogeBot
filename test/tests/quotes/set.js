
/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';
import { message } from '../../general.js';

import { Quotes } from '../../../dest/database/entity/quotes.js';

import quotes from '../../../dest/systems/quotes.js'

// users
const owner = { userName: '__broadcaster__', userId: 1 };

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

let id;
describe('Quotes - set() - @func3', () => {
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
            const item = await AppDataSource
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
            const item = await AppDataSource
              .createQueryBuilder()
              .select('quote')
              .from(Quotes, 'quote')
              .where('id = :id', { id: test.id })
              .getOne();
            assert(item === null);
          });
        }
      }
    });
  }
});
