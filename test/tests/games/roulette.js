/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const roulette = (require('../../../dest/games/roulette')).default;

const tests = [
  {
    user: { username: 'user1', userId: Number(_.random(999999, false)) },
  },
];

describe('game/roulette - !roulette', () => {
  for (const test of tests) {
    describe(`${test.user.username} uses !roulette`, async () => {
      before(async () => {
        await db.cleanup();
        await message.prepare();
      });

      it(`${test.user.username} starts roulette`, async () => {
        roulette.main({ sender: test.user });
      });

      it('Expecting win or lose', async () => {
        await message.isSent(['gambling.roulette.dead', 'gambling.roulette.alive'], test.user);
      });
    });
  }

  describe.only('/t/seppuku-and-roulette-points-can-be-negated/36', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await getRepository(User).save(tests[0].user);
    });

    it(`set lose value to 100`, () => {
      roulette.loserWillLose = 100;
    });

    it(`User starts roulette and we are waiting for lose`, async () => {
      let isAlive = true;
      while(isAlive) {
        isAlive = await roulette.main({ sender: tests[0].user });
      }
      await message.isSent('gambling.roulette.dead', tests[0].user);
    });

    it(`User should not have negative points`, async () => {
      const user = await getRepository(User).findOne({ userId: tests[0].user.userId });
      assert.equal(user.points, 0);
    });
  });
});
