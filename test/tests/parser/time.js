/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');
const { AppDataSource } = require('../../../dest/database.js');

const Parser = require('../../../dest/parser').default;

const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

const { User } = require('../../../dest/database/entity/user');

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
