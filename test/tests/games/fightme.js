/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/entity/user');

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
        global.games.fightme.main({ command, sender: test.challenger, parameters: test.challenging.username });
      });
      if (test.challenging.username.length === 0 || test.challenging.username === test.challenger.username) {
        it(`Expecting ${test.expected}`, async () => {
          await message.isSent(test.expected, test.challenger);
        });
      } else {
        it('Expecting gambling.fightme.challenge', async () => {
          await message.isSent('gambling.fightme.challenge', test.challenger, { username: test.challenging.username, command });
        });
        it('Challenged user is responding !fightme', async () => {
          global.games.fightme.main({ command, sender: test.challenging, parameters: test.challenger.username });
        });
        it(`Expecting ${test.expected}`, async () => {
          await message.isSent(test.expected, test.challenging, [
            { winner: test.challenging.username, loser: test.challenger.username, challenger: test.challenging.username },
            { winner: test.challenger.username, loser: test.challenging.username, challenger: test.challenger.username },
          ]);
        });
      }
    });
  }
});
