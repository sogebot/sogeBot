/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const variable = require('../../general.js').variable;
const { getLocalizedName } = require('../../../dest/commons');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Duel } = require('../../../dest/database/entity/duel');

const duel = (require('../../../dest/games/duel')).default;
const points = (require('../../../dest/systems/points')).default;

const _ = require('lodash');
const assert = require('assert');

const owner = { username: 'soge__', userId: Number(_.random(999999, false)) };
const user1 = { username: 'user1', userId: Number(_.random(999999, false)) };
const user2 = { username: 'user2', userId: Number(_.random(999999, false)) };
const command = '!duel';

describe('Gambling - duel', () => {
  describe('!duel bank', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('Bank should be empty at start', async () => {
      const responses = await duel.bank({ sender: user1 });
      assert(responses.length > 0);
      assert(responses[0].response === '$sender, current bank for !duel is 0 points', JSON.stringify({responses}));
    });

    it('Add 200 points to duel bank', async () => {
      for (let i = 0; i < 200; i++) {
        await getRepository(Duel).save({ tickets: 1, username: 'user' + i, id: i });
      }
      const items = await getRepository(Duel).find();
      assert.strictEqual(items.length, 200);
    });

    it('Bank should have 200 tickets', async () => {
      const responses = await duel.bank({ sender: user1 });
      assert(responses.length > 0);
      assert(responses[0].response === '$sender, current bank for !duel is 200 points', JSON.stringify({responses}));
    });
  });

  describe('#914 - user1 is not correctly added to duel, if he is challenger', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('set duel timestamp to 0 to force new duel', async () => {
      duel._timestamp = 0;
    });

    it('add points for users', async () => {
      await getRepository(User).save({ userId: user1.userId, username: user1.username, points: 100 });
      await getRepository(User).save({ userId: user2.userId, username: user2.username, points: 100 });
    });

    it('user 1 is challenging', async () => {
      const responses = await duel.main({ sender: user1, parameters: 'all', command });
      assert(responses.length > 0);
      assert(responses[0].response === '$sender is your new duel challenger! To participate use !duel [points], you have 5 minutes left to join.', JSON.stringify({responses}));
      assert(responses[1].response === '$sender, good luck with your dueling skills. You bet on yourself 100 points!', JSON.stringify({responses}));
    });

    it('user 2 is added to duel', async () => {
      const responses = await duel.main({ sender: user2, parameters: 'all', command });
      assert(responses.length > 0);
      assert(responses[0].response === '$sender, good luck with your dueling skills. You bet on yourself 100 points!', JSON.stringify({responses}));
    });

    it('set duel timestamp to force duel to end', async () => {
      // cannot set as 0 - duel is then ignored
      duel._timestamp = 1;
    });

    it('call pickDuelWinner()', () => {
      duel.pickDuelWinner();
    });

    it('winner should be announced', async () => {
      await message.isSent('gambling.duel.winner', { username: 'bot'}, [{
        pointsName: await points.getPointsName(200),
        points: 200,
        probability: _.round(50, 2),
        ticketsName: await points.getPointsName(100),
        tickets: 100,
        winner: user1.username,
      }, {
        pointsName: await points.getPointsName(200),
        points: 200,
        probability: _.round(50, 2),
        ticketsName: await points.getPointsName(100),
        tickets: 100,
        winner: user2.username,
      }]);
    });
  });

  describe('Pick winner from huge tickets', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create duel', async () => {
      duel._timestamp = Number(new Date());

      for (const [id, username] of Object.entries(['testuser', 'testuser2', 'testuser3', 'testuser4', 'testuser5'])) {
        const tickets = Math.floor(Number.MAX_SAFE_INTEGER / 10000000);
        await getRepository(Duel).save({ id: Number(id), username, tickets: tickets });
      }
    });

    it('pick winner - bot should not crash', async () => {
      await duel.pickDuelWinner();
    });
  });
});
