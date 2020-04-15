/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');
const assert = require('assert');
const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { prepare } = require('../../../dest/commons');

const fightme = (require('../../../dest/games/fightme')).default;
const translate = require('../../../dest/translate').translate;

const command = '!fightme';

const tests = [
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { username: '' },
    expected: 'gambling.fightme.notEnoughOptions',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 3, username: 'user1' },
    expected: 'gambling.fightme.cannotFightWithYourself',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 4, username: 'user2' },
    expected: 'gambling.fightme.winner',
  },
  {
    challenger: { userId: 5, username: 'broadcaster' },
    challenging: { userId: 3, username: 'user1' },
    expected: 'gambling.fightme.broadcaster',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 5, username: 'broadcaster' },
    expected: 'gambling.fightme.broadcaster',
  },
  {
    challenger: { userId: 1, username: 'usermod1' },
    challenging: { userId: 4, username: 'user2' },
    expected: 'gambling.fightme.oneModerator',
  },
  {
    challenger: { userId: 3, username: 'user1' },
    challenging: { userId: 2, username: 'usermod2' },
    expected: 'gambling.fightme.oneModerator',
  },
  {
    challenger: { userId: 1, username: 'usermod1' },
    challenging: { userId: 2, username: 'usermod2' },
    expected: 'gambling.fightme.bothModerators',
  },
];

describe('game/fightme - !fightme', () => {
  for (const test of tests) {
    describe(`challenger: ${test.challenger.username} | challenging: ${test.challenging.username} => ${test.expected}`, async () => {
      let responses = [];
      before(async () => {
        await db.cleanup();
        await message.prepare();

        await getRepository(User).save({ userId: 1, username: 'usermod1', isModerator: true });
        await getRepository(User).save({ userId: 2, username: 'usermod2', isModerator: true });
        await getRepository(User).save({ userId: 3, username: 'user1' });
        await getRepository(User).save({ userId: 4, username: 'user2' });
        await getRepository(User).save({ userId: 5, username: 'broadcaster' });
      });

      it('Challenger is starting !fightme', async () => {
        responses = await fightme.main({ command, sender: test.challenger, parameters: test.challenging.username });
      });
      if (test.challenging.username.length === 0 || test.challenging.username === test.challenger.username) {
        it(`Expecting ${test.expected}`, async () => {
          assert.strictEqual(responses[0].response, translate(test.expected), JSON.stringify({responses}));
        });
      } else {
        it('Expecting gambling.fightme.challenge', async () => {
          assert.strictEqual(responses[0].response, prepare('gambling.fightme.challenge', { username: test.challenging.username, command, sender: test.challenger.username }), JSON.stringify({responses}));
        });
        it('Challenged user is responding !fightme', async () => {
          responses = await fightme.main({ command, sender: test.challenging, parameters: test.challenger.username });
        });
        it(`Expecting ${test.expected}`, async () => {
          const firstMessage = prepare(test.expected, { winner: test.challenging.username, loser: test.challenger.username, challenger: test.challenging.username });
          const secondMessage = prepare(test.expected, { winner: test.challenger.username, loser: test.challenging.username, challenger: test.challenger.username });
          assert(responses[0].response === firstMessage || responses[0].response === secondMessage, JSON.stringify({responses}));
        });
      }
    });
  }
});
