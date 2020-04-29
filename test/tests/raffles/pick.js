/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');
const commons = require('../../../dest/commons');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Raffle } = require('../../../dest/database/entity/raffle');

const raffles = (require('../../../dest/systems/raffles')).default;

const assert = require('assert');

const max = Math.floor(Number.MAX_SAFE_INTEGER / 10000000);

const owner = { username: 'soge__', userId: Number(_.random(999999, false)) };
const testuser = { username: 'testuser', userId: Number(_.random(999999, false)) };
const testuser2 = { username: 'testuser2', userId: Number(_.random(999999, false)) };

describe('Raffles - pick()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('Empty raffle with pick should be closed', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 1,
        max: max,
      });
    });

    it('pick a winner', async () => {
      const r = await raffles.pick({ sender: owner });
      const raffle = await getRepository(Raffle).findOne({
        order: {
          timestamp: 'DESC',
        },
      });
      assert.strictEqual(r[0].response, '$sender, nobody joined a raffle');
      assert(raffle.isClosed);
      assert(raffle.winner === null);
    });
  });

  describe('#1318 - 4 subs should have 25% win', () => {
    it('Set subscribers luck to 150%', async () => {
      raffles.subscribersPercent = 150;
    });

    it('Create subscribers raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -for subscribers' });
      await message.isSent('raffles.announce-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-subscribers-item'),
      });
    });

    const subs = ['sub1', 'sub2', 'sub3', 'sub4'];
    for (const [id, v] of Object.entries(subs)) {
      it('Add user ' + v + ' to db', async () => {
        await getRepository(User).save({ username: v , userId: Number('100' + id), isSubscriber: true });
      });

      it('Add user ' + v + ' to raffle', async () => {
        const a = await raffles.participate({ sender: { username: v, userId: Number('100' + id) }, message: '!winme' });
        assert(a);
      });
    }

    it('pick a winner', async () => {
      await raffles.pick({ sender: owner });

      await message.isSent('raffles.raffle-winner-is', { username: 'bot' }, [{
        username: 'sub1',
        keyword: '!winme',
        probability: 25,
      }, {
        username: 'sub2',
        keyword: '!winme',
        probability: 25,
      }, {
        username: 'sub3',
        keyword: '!winme',
        probability: 25,
      }, {
        username: 'sub4',
        keyword: '!winme',
        probability: 25,
      }]);
    });
  });

  describe('Raffle should return winner', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 1,
        max: max,
      });
    });


    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({username: testuser.username})
      await getRepository(User).delete({username: testuser2.username})
      user1 = await getRepository(User).save({ username: testuser.username , userId: testuser.userId, points: max });
      user2 = await getRepository(User).save({ username: testuser2.username , userId: testuser2.userId, points: max });
    });

    it('testuser bets max', async () => {
      const a = await raffles.participate({ sender: testuser, message: `!winme ${max}` });
      assert(a);
    });

    it('testuser2 bets half of max', async () => {
      const a = await raffles.participate({ sender: testuser2, message: `!winme ${max / 2}` });
      assert(a);
    });

    it('pick a winner', async () => {
      await raffles.pick({ sender: owner });

      await message.isSent('raffles.raffle-winner-is', { username: 'bot' }, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 66.67,
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 33.33,
      }]);
    });
  });

  describe('Raffle with follower should return winner', () => {
    let user1, user2;

    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 1,
        max: max,
      });
    });

    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({username: testuser.username})
      await getRepository(User).delete({username: testuser2.username})
      user1 = await getRepository(User).save({ isFollower: true, username: testuser.username , userId: testuser.userId, points: max });
      user2 = await getRepository(User).save({ username: testuser2.username , userId: testuser2.userId, points: max });
    });

    it('testuser bets 100', async () => {
      const a = await raffles.participate({ sender: testuser, message: '!winme 100' });
      assert(a);
    });

    it('testuser2 bets 100', async () => {
      const a = await raffles.participate({ sender: testuser2, message: '!winme 100' });
      assert(a);
    });

    it('pick a winner', async () => {
      await raffles.pick({ sender: owner });

      await message.isSent('raffles.raffle-winner-is', { username: 'bot' }, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 54.55,
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 45.45,
      }]);
    });
  });

  describe('Raffle with subscriber should return winner', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 1,
        max: max,
      });
    });

    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({username: testuser.username})
      await getRepository(User).delete({username: testuser2.username})
      user1 = await getRepository(User).save({ isSubscriber: true, username: testuser.username , userId: testuser.userId, points: max });
      user2 = await getRepository(User).save({ username: testuser2.username , userId: testuser2.userId, points: max });
    });

    it('testuser bets 100', async () => {
      const a = await raffles.participate({ sender: testuser, message: '!winme 100' });
      assert(a);
    });

    it('testuser2 bets 100', async () => {
      const a = await raffles.participate({ sender: testuser2, message: '!winme 100' });
      assert(a);
    });

    it('pick a winner', async () => {
      await raffles.pick({ sender: owner });

      await message.isSent('raffles.raffle-winner-is', { username: 'bot' }, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 60,
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 40,
      }]);
    });
  });

  describe('Raffle with subscriber and follower should return winner', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
        keyword: '!winme',
        eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
        min: 1,
        max: max,
      });
    });

    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({username: testuser.username})
      await getRepository(User).delete({username: testuser2.username})
      user1 = await getRepository(User).save({ isSubscriber: true, username: testuser.username , userId: testuser.userId, points: max });
      user2 = await getRepository(User).save({ isFollower: true, username: testuser2.username , userId: testuser2.userId, points: max });
    });

    it('testuser bets 100', async () => {
      const a = await raffles.participate({ sender: testuser, message: '!winme 100' });
      assert(a);
    });

    it('testuser2 bets 100', async () => {
      const a = await raffles.participate({ sender: testuser2, message: '!winme 100' });
      assert(a);
    });

    it('pick a winner', async () => {
      await raffles.pick({ sender: owner });

      await message.isSent('raffles.raffle-winner-is', { username: 'bot' }, [{
        username: testuser.username,
        keyword: '!winme',
        probability: 55.56,
      }, {
        username: testuser2.username,
        keyword: '!winme',
        probability: 44.44,
      }]);
    });
  });
});
