/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');
const { AppDataSource } = require('../../../dest/database.js');

const Parser = require('../../../dest/parser').default;

const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

const { User } = require('../../../dest/database/entity/user');

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
