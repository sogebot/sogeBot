/* global describe it before */

require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { getRepository } = require('typeorm');

const { RaffleParticipant } = require('../../../dest/database/entity/raffle');
const { User } = require('../../../dest/database/entity/user');
const raffles = (require('../../../dest/systems/raffles')).default;
const message = require('../../general.js').message;
const db = require('../../general.js').db;

const max = 100;

const owner = { username: '__broadcaster__', userId: String(_.random(999999, false)) };
const testuser = { username: 'testuser', userId: String(_.random(999999, false)) };
const testuser2 = { username: 'testuser2', userId: String(_.random(999999, false)) };
const testuser3 = { username: 'testuser3', userId: String(_.random(999999, false)) };
const testuser4 = { username: 'testuser4', userId: String(_.random(999999, false)) };

describe('Raffles - user should be able to compete within boundaries of tickets', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    raffles.allowOverTicketing = false;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-100>". Raffle is opened for everyone.', { username: '__bot_username__' });
  });

  it('create testuser/testuser2/testuser3 with max points', async () => {
    await getRepository(User).delete({ username: testuser.username });
    await getRepository(User).delete({ username: testuser2.username });
    await getRepository(User).delete({ username: testuser3.username });
    await getRepository(User).delete({ username: testuser4.username });
    await getRepository(User).save({
      username: testuser.username, userId: testuser.userId, points: max,
    });
    await getRepository(User).save({
      username: testuser2.username, userId: testuser2.userId, points: max,
    });
    await getRepository(User).save({
      username: testuser3.username, userId: testuser3.userId, points: max,
    });
    await getRepository(User).save({
      username: testuser4.username, userId: testuser4.userId, points: max,
    });
  });

  it('testuser bets min', async () => {
    const a = await raffles.participate({ sender: testuser, message: '!winme 1' });
    assert.ok(a);
  });

  it('testuser2 bets max', async () => {
    const a = await raffles.participate({ sender: testuser2, message: '!winme 100' });
    assert.ok(a);
  });

  it('testuser3 bets below min', async () => {
    const a = await raffles.participate({ sender: testuser2, message: '!winme 0' });
    assert.ok(!a);
  });

  it('testuser4 bets above max', async () => {
    const a = await raffles.participate({ sender: testuser2, message: '!winme 101' });
    assert.ok(!a);
  });

  it('we should have only 2 raffle participants', async () => {
    assert.strictEqual(await getRepository(RaffleParticipant).count(), 2);
  });

  for (const viewer of [testuser.username, testuser2.username]) {
    it(`user ${viewer} should be in raffle participants`, async () => {
      assert.strictEqual(await getRepository(RaffleParticipant).count({ username: viewer }), 1);
    });
  }

  for (const viewer of [testuser3.username, testuser4.username]) {
    it(`user ${viewer} should not be in raffle participants`, async () => {
      assert.strictEqual(await getRepository(RaffleParticipant).count({ username: viewer }), 0);
    });
  }
});
