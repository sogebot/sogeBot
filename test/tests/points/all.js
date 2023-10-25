/* global describe it before */

import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { User } from '../../../dest/database/entity/user.js';

import points from '../../../dest/systems/points.js';

const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__' };
const user1 = { userId: String(Math.floor(Math.random() * 100000)), userName: 'user1', points: 100 };
const user2 = { userId: String(Math.floor(Math.random() * 100000)), userName: 'user2' };

describe('Points - all() - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save(owner);
    await AppDataSource.getRepository(User).save(user1);
    await AppDataSource.getRepository(User).save(user2);
  });

  describe('Points should be correctly given', () => {
    it('!points get should return 0 for owner', async () => {
      const r = await points.get({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, '@__broadcaster__ has currently 0 points. Your position is ?/3.');
    });

    it('!points get should return 100 for user1', async () => {
      const r = await points.get({ sender: user1, parameters: '' });
      assert.strictEqual(r[0].response, '@user1 has currently 100 points. Your position is 1/3.');
    });

    it('!points get should return 0 for user2', async () => {
      const r = await points.get({ sender: user2, parameters: '@user2 has currently 0 points. Your position is 2/3.' });
      assert.strictEqual(r[0].response, '@user2 has currently 0 points. Your position is 2/3.');
    });

    it('!points all 100', async () => {
      const r = await points.all({ sender: owner, parameters: '100' });
      assert.strictEqual(r[0].response, 'All users just received 100 points!');
    });

    it('!points get should return 100 for owner', async () => {
      const r = await points.get({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, '@__broadcaster__ has currently 100 points. Your position is ?/3.');
    });

    it('!points get should return 200 for user1', async () => {
      const r = await points.get({ sender: user1, parameters: '' });
      assert.strictEqual(r[0].response, '@user1 has currently 200 points. Your position is 1/3.');
    });

    it('!points get should return 100 for user2', async () => {
      const r = await points.get({ sender: user2, parameters: '' });
      assert.strictEqual(r[0].response, '@user2 has currently 100 points. Your position is 2/3.');
    });

    it('!points all -150', async () => {
      const r = await points.all({ sender: owner, parameters: '-150' });
      assert.strictEqual(r[0].response, 'All users just lost -150 points!');
    });

    it('!points get should return 0 for owner', async () => {
      const r = await points.get({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, '@__broadcaster__ has currently 0 points. Your position is ?/3.');
    });

    it('!points get should return 50 for user1', async () => {
      const r = await points.get({ sender: user1, parameters: '' });
      assert.strictEqual(r[0].response, '@user1 has currently 50 points. Your position is 1/3.');
    });

    it('!points get should return 0 for user2', async () => {
      const r = await points.get({ sender: user2, parameters: '' });
      assert.strictEqual(r[0].response, '@user2 has currently 0 points. Your position is 2/3.');
    });
  });
});
