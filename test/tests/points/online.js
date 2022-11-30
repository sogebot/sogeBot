/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');
const { AppDataSource } = require('../../../dest/database.js');

const { User } = require('../../../dest/database/entity/user');

const points = (require('../../../dest/systems/points')).default;

const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__' };
const user1 = { userId: String(Math.floor(Math.random() * 100000)), userName: 'user1', points: 100 };
const user2 = { userId: String(Math.floor(Math.random() * 100000)), userName: 'user2' };

async function setUsersOnline(users) {
  await AppDataSource.getRepository(User).update({}, { isOnline: false });
  for (const userName of users) {
    await AppDataSource.getRepository(User).update({ userName }, { isOnline: true });
  }
}

describe('Points - online() - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save(owner);
    await AppDataSource.getRepository(User).save(user1);
    await AppDataSource.getRepository(User).save(user2);
  });

  describe('Points should be correctly given', () => {
    it('set users online', async () => {
      await setUsersOnline(['__broadcaster__', 'user1', 'user2']);
    });

    it('!points get should return 0 for owner', async () => {
      const r = await points.get({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, `@__broadcaster__ has currently 0 points. Your position is ?/3.`);
    });

    it('!points get should return 100 for user1', async () => {
      const r = await points.get({ sender: user1, parameters: '' });
      assert.strictEqual(r[0].response, `@user1 has currently 100 points. Your position is 1/3.`);
    });

    it('!points get should return 0 for user2', async () => {
      const r = await points.get({ sender: user2, parameters: '' });
      assert.strictEqual(r[0].response, `@user2 has currently 0 points. Your position is 2/3.`);
    });

    it('!points all 100', async () => {
      const r = await points.all({ sender: owner, parameters: '100' });
      assert.strictEqual(r[0].response, `All users just received 100 points!`);
    });

    it('!points get should return 100 for owner', async () => {
      const r = await points.get({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, `@__broadcaster__ has currently 100 points. Your position is ?/3.`);
    });

    it('!points get should return 200 for user1', async () => {
      const r = await points.get({ sender: user1, parameters: '' });
      assert.strictEqual(r[0].response, `@user1 has currently 200 points. Your position is 1/3.`);
    });

    it('!points get should return 100 for user2', async () => {
      const r = await points.get({ sender: user2, parameters: '' });
      assert.strictEqual(r[0].response, `@user2 has currently 100 points. Your position is 2/3.`);
    });

    it('!points all -150', async () => {
      const r = await points.all({ sender: owner, parameters: '-150' });
      assert.strictEqual(r[0].response, `All users just lost -150 points!`);
    });

    it('!points get should return 0 for owner', async () => {
      const r = await points.get({ sender: owner, parameters: '' });
      assert.strictEqual(r[0].response, `@__broadcaster__ has currently 0 points. Your position is ?/3.`);
    });

    it('!points get should return 50 for user1', async () => {
      const r = await points.get({ sender: user1, parameters: '' });
      assert.strictEqual(r[0].response, `@user1 has currently 50 points. Your position is 1/3.`);
    });

    it('!points get should return 0 for user2', async () => {
      const r = await points.get({ sender: user2, parameters: '' });
      assert.strictEqual(r[0].response, `@user2 has currently 0 points. Your position is 2/3.`);
    });
  });
});
