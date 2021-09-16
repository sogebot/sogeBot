/* global describe it before */

require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { getRepository } = require('typeorm');

const { Raffle } = require('../../../dest/database/entity/raffle');
const { User } = require('../../../dest/database/entity/user');
const raffles = (require('../../../dest/systems/raffles')).default;
const message = require('../../general.js').message;
const db = require('../../general.js').db;

const max = Math.floor(Number.MAX_SAFE_INTEGER / 10000000);

const owner = { username: '__broadcaster__', userId: String(_.random(999999, false)) };
const testuser = { username: 'testuser', userId: String(_.random(999999, false)) };
const testuser2 = { username: 'testuser2', userId: String(_.random(999999, false)) };

describe('Raffles - pick()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('Empty raffle with pick should be closed', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-' + max + '>". Raffle is opened for everyone.', { username: 'bot' });
    });

    it('pick a winner', async () => {
      const r = await raffles.pick({ sender: owner });
      const raffle = await getRepository(Raffle).findOne({ order: { timestamp: 'DESC' } });
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
      raffles.open({ sender: owner, parameters: '!winme -for subscribers.' });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme". Raffle is opened for subscribers.', { username: 'bot' });
    });

    const subs = ['sub1', 'sub2', 'sub3', 'sub4'];
    for (const [id, v] of Object.entries(subs)) {
      it('Add user ' + v + ' to db', async () => {
        await getRepository(User).save({
          username: v , userId: String('100' + id), isSubscriber: true,
        });
      });

      it('Add user ' + v + ' to raffle', async () => {
        const a = await raffles.participate({ sender: { username: v, userId: String('100' + id) }, message: '!winme' });
        assert(a);
      });
    }

    it('pick a winner', async () => {
      await raffles.pick({ sender: owner });
      await message.isSentRaw([
        'Winner of raffle !winme is @sub1! Win probability was 25%!',
        'Winner of raffle !winme is @sub2! Win probability was 25%!',
        'Winner of raffle !winme is @sub3! Win probability was 25%!',
        'Winner of raffle !winme is @sub4! Win probability was 25%!',
      ], { username: 'bot' });
    });
  });

  describe('Raffle should return winner', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-'+max+'>". Raffle is opened for everyone.', { username: 'bot' });
    });

    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({ username: testuser.username });
      await getRepository(User).delete({ username: testuser2.username });
      user1 = await getRepository(User).save({
        username: testuser.username , userId: testuser.userId, points: max,
      });
      user2 = await getRepository(User).save({
        username: testuser2.username , userId: testuser2.userId, points: max,
      });
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
      await message.isSentRaw([
        'Winner of raffle !winme is @' + testuser.username + '! Win probability was 66.67%!',
        'Winner of raffle !winme is @' + testuser2.username + '! Win probability was 33.33%!',
      ], { username: 'bot' });
    });
  });

  describe('Raffle with follower should return winner', () => {
    let user1, user2;

    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-'+max+'>". Raffle is opened for everyone.', { username: 'bot' });
    });

    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({ username: testuser.username });
      await getRepository(User).delete({ username: testuser2.username });
      user1 = await getRepository(User).save({
        isFollower: true, username: testuser.username , userId: testuser.userId, points: max,
      });
      user2 = await getRepository(User).save({
        username: testuser2.username , userId: testuser2.userId, points: max,
      });
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
      await message.isSentRaw([
        'Winner of raffle !winme is @' + testuser.username + '! Win probability was 54.55%!',
        'Winner of raffle !winme is @' + testuser2.username + '! Win probability was 45.45%!',
      ], { username: 'bot' });
    });
  });

  describe('Raffle with subscriber should return winner', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-'+max+'>". Raffle is opened for everyone.', { username: 'bot' });
    });

    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({ username: testuser.username });
      await getRepository(User).delete({ username: testuser2.username });
      user1 = await getRepository(User).save({
        isSubscriber: true, username: testuser.username , userId: testuser.userId, points: max,
      });
      user2 = await getRepository(User).save({
        username: testuser2.username , userId: testuser2.userId, points: max,
      });
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
      await message.isSentRaw([
        'Winner of raffle !winme is @' + testuser.username + '! Win probability was 60%!',
        'Winner of raffle !winme is @' + testuser2.username + '! Win probability was 40%!',
      ], { username: 'bot' });
    });
  });

  describe('Raffle with subscriber and follower should return winner', () => {
    it('create ticket raffle', async () => {
      raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-'+max+'>". Raffle is opened for everyone.', { username: 'bot' });
    });

    it('Create testuser/testuser2 with max points', async () => {
      await getRepository(User).delete({ username: testuser.username });
      await getRepository(User).delete({ username: testuser2.username });
      user1 = await getRepository(User).save({
        isSubscriber: true, username: testuser.username , userId: testuser.userId, points: max,
      });
      user2 = await getRepository(User).save({
        isFollower: true, username: testuser2.username , userId: testuser2.userId, points: max,
      });
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
      await message.isSentRaw([
        'Winner of raffle !winme is @' + testuser.username + '! Win probability was 55.56%!',
        'Winner of raffle !winme is @' + testuser2.username + '! Win probability was 44.44%!',
      ], { username: 'bot' });
    });
  });
});
