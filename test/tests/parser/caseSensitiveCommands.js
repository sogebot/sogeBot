/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const Parser = require('../../../dest/parser').default;

const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

describe('Parser - case sensitive commands', async () => {
  const tests = [
    {
      test: '!me',
      expected: '@soge__ | 0.0h | 0 points | 0 messages | 0.00€ | 0 bits',
    },
    {
      test: '!ME',
      expected: '@soge__ | 0.0h | 0 points | 0 messages | 0.00€ | 0 bits',
    },
  ];

  for (const test of tests) {
    describe(`'${test.test}' expect '${test.expected}'`, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();

        await getRepository(User).save({ username: owner.username, userId: owner.userId });
      });

      it(`Run command '${test.test}'`, async () => {
        const parse = new Parser({ sender: owner, message: test.test, skip: false, quiet: false });
        await parse.process();
      });

      it(`Expect message '${test.expected}`, async () => {
        await message.isSentRaw(test.expected, owner);
      });
    });
  }
});
