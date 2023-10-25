/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { Parser } from '../../../dest/parser.js';

const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

import { User } from '../../../dest/database/entity/user.js';

describe('Parser - case sensitive commands - @func2', async () => {
  const tests = [
    {
      test: '!me',
      expected: '@__broadcaster__ | 0 hours | 0 points | 0 messages | 0.00€ | 0 bits',
    },
    {
      test: '!ME',
      expected: '@__broadcaster__ | 0 hours | 0 points | 0 messages | 0.00€ | 0 bits',
    },
  ];

  for (const test of tests) {
    describe(`'${test.test}' expect '${test.expected}'`, async () => {
      let r;
      before(async () => {
        await db.cleanup();
        await message.prepare();

        await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
      });

      it(`Run command '${test.test}'`, async () => {
        const parse = new Parser({ sender: owner, message: test.test, skip: false, quiet: false });
        r = await parse.process();
      });

      it(`Expect message '${test.expected}`, async () => {
        assert(r[0].response, test.expected);
      });
    });
  }
});
