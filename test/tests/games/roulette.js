/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');
const _ = require('lodash');

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
});
