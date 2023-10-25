/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { Parser } from '../../../dest/parser.js';

const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

import { User } from '../../../dest/database/entity/user.js';

describe('Parser - parse time check - @func2', async () => {
  const tests = [
    {
      test: '!me',
      expected: 400,
    },
  ];

  for (const test of tests) {
    describe(`'${test.test}' expect ${test.expected}ms`, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();

        await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
      });

      let time;
      it(`Run command '${test.test}'`, async () => {
        time = Date.now();
        const parse = new Parser({ sender: owner, message: test.test, skip: false, quiet: false });
        await parse.process();
      });

      it(`Should take to ${test.expected}ms to parse`, async () => {
        assert(Date.now() - time < test.expected, `${Date.now() - time} > ${test.expected}`);
      });
    });
  }
});
