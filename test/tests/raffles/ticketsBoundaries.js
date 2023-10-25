/* global describe it before */

import('../../general.js');

import assert from 'assert';

import _ from 'lodash-es';
import { AppDataSource } from '../../../dest/database.js';

import { RaffleParticipant } from '../../../dest/database/entity/raffle.js';
import { User } from '../../../dest/database/entity/user.js';
import raffles from '../../../dest/systems/raffles.js';
import { message } from '../../general.js';
import { db } from '../../general.js';

const max = 100;

const owner = { userName: '__broadcaster__', userId: String(_.random(999999, false)) };
const testuser = { userName: 'testuser', userId: String(_.random(999999, false)) };
const testuser2 = { userName: 'testuser2', userId: String(_.random(999999, false)) };
const testuser3 = { userName: 'testuser3', userId: String(_.random(999999, false)) };
const testuser4 = { userName: 'testuser4', userId: String(_.random(999999, false)) };

describe('Raffles - user should be able to compete within boundaries of tickets - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    raffles.allowOverTicketing = false;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: owner, parameters: '!winme -min 0 -max ' + max });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-100>". Raffle is opened for everyone.', { userName: '__bot__' });
  });

  it('create testuser/testuser2/testuser3 with max points', async () => {
    await AppDataSource.getRepository(User).delete({ userName: testuser.userName });
    await AppDataSource.getRepository(User).delete({ userName: testuser2.userName });
    await AppDataSource.getRepository(User).delete({ userName: testuser3.userName });
    await AppDataSource.getRepository(User).delete({ userName: testuser4.userName });
    await AppDataSource.getRepository(User).save({
      userName: testuser.userName, userId: testuser.userId, points: max,
    });
    await AppDataSource.getRepository(User).save({
      userName: testuser2.userName, userId: testuser2.userId, points: max,
    });
    await AppDataSource.getRepository(User).save({
      userName: testuser3.userName, userId: testuser3.userId, points: max,
    });
    await AppDataSource.getRepository(User).save({
      userName: testuser4.userName, userId: testuser4.userId, points: max,
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
    assert.strictEqual(await AppDataSource.getRepository(RaffleParticipant).count(), 2);
  });

  for (const viewer of [testuser.userName, testuser2.userName]) {
    it(`user ${viewer} should be in raffle participants`, async () => {
      assert.strictEqual(await AppDataSource.getRepository(RaffleParticipant).countBy({ username: viewer }), 1);
    });
  }

  for (const viewer of [testuser3.userName, testuser4.userName]) {
    it(`user ${viewer} should not be in raffle participants`, async () => {
      assert.strictEqual(await AppDataSource.getRepository(RaffleParticipant).countBy({ username: viewer }), 0);
    });
  }
});
