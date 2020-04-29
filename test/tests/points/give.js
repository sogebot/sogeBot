/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');
const assert = require('assert');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const points = (require('../../../dest/systems/points')).default;

const user1 = { username: 'user1', points: 100, userId: Number(_.random(999999, false)) };
const user2 = { username: 'user2', points: 100, userId: Number(_.random(999999, false)) };

describe('Points - give()', () => {
  describe('user1 will give 50 points to user2', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create user1', async () => {
      await getRepository(User).save({ username: user1.username, userId: user1.userId, points: user1.points });
    });

    it('create user2', async () => {
      await getRepository(User).save({ username: user2.username, userId: user2.userId, points: user2.points });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });

    it('user1 send 50 points', async () => {
      const r = await points.give({ sender: user1, parameters: 'user2 50' });
      assert.strictEqual(r[0].response, `$sender just gave his 50 points to @user2`);
    });

    it('user1 should have 50 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 50);
    });

    it('user2 should have 150 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 150);
    });
  });

  describe('user1 will give 150 points to user2', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create user1', async () => {
      await getRepository(User).save({ username: user1.username, userId: user1.userId, points: user1.points });
    });

    it('create user2', async () => {
      await getRepository(User).save({ username: user2.username, userId: user2.userId, points: user2.points });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });

    it('user1 send 150 points', async () => {
      const r = await points.give({ sender: user1, parameters: 'user2 150' });
      assert.strictEqual(r[0].response, `Sorry, $sender, you don't have 150 points to give it to @user2`);
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });
  });

  describe('user1 will give all points to user2', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create user1', async () => {
      await getRepository(User).save({ username: user1.username, userId: user1.userId, points: user1.points });
    });

    it('create user2', async () => {
      await getRepository(User).save({ username: user2.username, userId: user2.userId, points: user2.points });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });

    it('user1 send all points', async () => {
      const r = await points.give({ sender: user1, parameters: 'user2 all' });
      assert.strictEqual(r[0].response, `$sender just gave his 100 points to @user2`);
    });

    it('user1 should have 0 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 0);
    });

    it('user2 should have 200 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 200);
    });
  });

  describe('user1 will give points without points value', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create user1', async () => {
      await getRepository(User).save({ username: user1.username, userId: user1.userId, points: user1.points });
    });

    it('create user2', async () => {
      await getRepository(User).save({ username: user2.username, userId: user2.userId, points: user2.points });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });

    it('user1 send wrong command', async () => {
      const r = await points.give({ sender: user1, parameters: 'user2', command: '!points give' });
      assert.strictEqual(r[0].response, `Sorry, $sender, but this command is not correct, use !points give [username] [amount]`);
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });
  });

  describe('user1 will give string points to user2', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create user1', async () => {
      await getRepository(User).save({ username: user1.username, userId: user1.userId, points: user1.points });
    });

    it('create user2', async () => {
      await getRepository(User).save({ username: user2.username, userId: user2.userId, points: user2.points });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });

    it('user1 send wrong string points', async () => {
      const r = await points.give({ sender: user1, parameters: 'user2 something', command: '!points give' });
      assert.strictEqual(r[0].response, `Sorry, $sender, but this command is not correct, use !points give [username] [amount]`);
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });
  });
});
