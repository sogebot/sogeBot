
/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import assert from 'assert';
import { message } from '../../general.js';

import { AppDataSource } from '../../../dest/database.js';
import { Quotes } from '../../../dest/database/entity/quotes.js';

import quotes from '../../../dest/systems/quotes.js'

// users
const owner = { userName: '__broadcaster__', userId: 1 };


const tests = [
  { sender: owner, parameters: '', shouldFail: true },
  { sender: owner, parameters: '-id', shouldFail: true },
  { sender: owner, parameters: '-id a', id: 'a', shouldFail: true, exist: false },
  { sender: owner, parameters: '-id 99999', id: 99999, shouldFail: false, exist: false },
  { sender: owner, parameters: '-id $id', id: 1, shouldFail: false, exist: true },
];

describe('Quotes - remove() - @func3', () => {
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
          const items = await AppDataSource
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
            const items = await AppDataSource
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
            const items = await AppDataSource
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
