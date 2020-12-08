/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');
const assert = require('assert');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

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
  describe('Challenge should be removed after a while', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await getRepository(User).save({ userId: 10, username: 'user10' });
      await getRepository(User).save({ userId: 11, username: 'user11' });
    });

    it('Challenger is starting !fightme', async () => {
      await fightme.main({ command, sender: { userId: 10, username: 'user10' }, parameters: 'user11' });
    });

    it('Challenge should be saved', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 1);
    });

    const steps = 50;
    for (let i = 0; i < steps; i++) {
      it(i === 0 ? 'We need to wait at least 2.5 minutes' : '.'.repeat(i), async () => {
        await time.waitMs((60000 * 2.5) / steps);
      });
    }

    it('Challenges should be empty', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 0);
    });
  });

  describe('Doubled challenge should not add to challenge, but refresh time', () => {
    let removeAt = 0;

    before(async () => {
      await db.cleanup();
      await message.prepare();
      await getRepository(User).save({ userId: 10, username: 'user10' });
      await getRepository(User).save({ userId: 11, username: 'user11' });
    });

    it('Challenger is starting !fightme', async () => {
      await fightme.main({ command, sender: { userId: 10, username: 'user10' }, parameters: 'user11' });
    });

    it('Challenge should be saved', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 1);
      removeAt = fightMeChallenges[0].removeAt;
    });

    it('Challenger is starting !fightme again ', async () => {
      await fightme.main({ command, sender: { userId: 10, username: 'user10' }, parameters: 'user11' });
    });

    it('We are not expecting additional challenge', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.strictEqual(fightMeChallenges.length, 1);
    });

    it('We are expecting updated removeAt time', () => {
      const fightMeChallenges = (require('../../../dest/games/fightme')).fightMeChallenges;
      assert.notStrictEqual(fightMeChallenges[0].removeAt, removeAt);
    });
  });

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
