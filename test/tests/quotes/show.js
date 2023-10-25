/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { User } from '../../../dest/database/entity/user.js';

import quotes from '../../../dest/systems/quotes.js'

// users
const owner = { userName: '__broadcaster__', userId: '1' };
const user = { userName: 'user', userId: '3' };

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

describe('Quotes - main() - @func3', () => {
  for (const test of tests) {
    let id, r;
    describe(test.parameters, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
        await AppDataSource.getRepository(User).save({ userName: user.userName, userId: user.userId });
        await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
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
            assert.strictEqual(r[0].response, `Quote ${id} by __broadcaster__ 'Lorem Ipsum'`);
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
