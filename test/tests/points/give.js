/* global describe it before */

import('../../general.js');

import assert from 'assert';

import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import { User } from '../../../dest/database/entity/user.js';
import points from '../../../dest/systems/points.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

const user1 = {
  userName: 'user1', points: 100, userId: String(_.random(999999, false)),
};
const user2 = {
  userName: 'user2', points: 100, userId: String(_.random(999999, false)),
};

describe('Points - give() - @func1', () => {
  describe('user1 will give 50 points to user2', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create user1', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user1.userName, userId: user1.userId, points: user1.points,
      });
    });

    it('create user2', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user2.userName, userId: user2.userId, points: user2.points,
      });
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
      await AppDataSource.getRepository(User).save({
        userName: user1.userName, userId: user1.userId, points: user1.points,
      });
    });

    it('create user2', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user2.userName, userId: user2.userId, points: user2.points,
      });
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
      await AppDataSource.getRepository(User).save({
        userName: user1.userName, userId: user1.userId, points: user1.points,
      });
    });

    it('create user2', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user2.userName, userId: user2.userId, points: user2.points,
      });
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
      await AppDataSource.getRepository(User).save({
        userName: user1.userName, userId: user1.userId, points: user1.points,
      });
    });

    it('create user2', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user2.userName, userId: user2.userId, points: user2.points,
      });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });

    it('user1 send wrong command', async () => {
      const r = await points.give({
        sender: user1, parameters: 'user2', command: '!points give',
      });
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
      await AppDataSource.getRepository(User).save({
        userName: user1.userName, userId: user1.userId, points: user1.points,
      });
    });

    it('create user2', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user2.userName, userId: user2.userId, points: user2.points,
      });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });

    it('user1 send wrong string points', async () => {
      const r = await points.give({
        sender: user1, parameters: 'user2 something', command: '!points give',
      });
      assert.strictEqual(r[0].response, `Sorry, $sender, but this command is not correct, use !points give [username] [amount]`);
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 100);
    });
  });

  describe('Giving 0 points should trigger error - https://community.sogebot.xyz/t/sending-0-points/214', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create user1', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user1.userName, userId: user1.userId, points: user1.points,
      });
    });

    it('create user2', async () => {
      await AppDataSource.getRepository(User).save({
        userName: user2.userName, userId: user2.userId, points: 0,
      });
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 0 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 0);
    });

    it('user1 send 0 points', async () => {
      const r = await points.give({
        sender: user1, parameters: 'user2 0', command: '!points give',
      });
      assert.strictEqual(r[0].response, `Sorry, $sender, you cannot give 0 points to @user2`);
    });

    it('user2 send all points', async () => {
      const r = await points.give({
        sender: user2, parameters: 'user1 all', command: '!points give',
      });
      assert.strictEqual(r[0].response, `Sorry, $sender, you cannot give 0 points to @user1`);
    });

    it('user1 should have 100 points', async () => {
      assert.strict.equal(await points.getPointsOf(user1.userId), 100);
    });

    it('user2 should have 0 points', async () => {
      assert.strict.equal(await points.getPointsOf(user2.userId), 0);
    });
  });
});
