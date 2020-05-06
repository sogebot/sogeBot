/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const Parser = require('../../../dest/parser').default;

const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

describe('Parser - parse time check', async () => {
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

        await getRepository(User).save({ username: owner.username, userId: owner.userId });
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
