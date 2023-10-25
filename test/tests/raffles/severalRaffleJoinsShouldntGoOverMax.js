
/* global */

import('../../general.js');
import assert from 'assert';
import { IsNull } from 'typeorm';

import * as commons from '../../../dest/commons.js'
import { AppDataSource } from '../../../dest/database.js';
import { Raffle } from '../../../dest/database/entity/raffle.js';
import { User } from '../../../dest/database/entity/user.js';
import * as changelog from '../../../dest/helpers/user/changelog.js';
import raffles from '../../../dest/systems/raffles.js';
import { db, message, user } from '../../general.js';

describe('Raffles - several raffle joins shouldnt go over max - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    raffles.allowOverTicketing = true;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 100' });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-100>". Raffle is opened for everyone.', { userName: '__bot__' });
  });

  it('Update viewer and viewer2 to have 200 points', async () => {
    await AppDataSource.getRepository(User).save({
      userName: user.viewer.userName, userId: user.viewer.userId, points: 200,
    });
    await AppDataSource.getRepository(User).save({
      userName: user.viewer2.userName, userId: user.viewer2.userId, points: 200,
    });
  });

  it('Viewer bets max allowed points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
    assert(a);
  });

  it('Viewer2 bets 50 points', async () => {
    const a = await raffles.participate({ sender: user.viewer2, message: '!winme 50' });
    assert(a);
  });

  it('Viewer bets max allowed points - again', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
    assert(a);
  });

  it('expecting 2 participants to have bet of 100 and 50', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where:     { winner: IsNull(), isClosed: false },
    });
    assert.strictEqual(raffle.participants.length, 2);
    try {
      assert.strictEqual(raffle.participants[0].tickets, 100);
      assert.strictEqual(raffle.participants[1].tickets, 50);
    } catch (e) {
      assert.strictEqual(raffle.participants[0].tickets, 50);
      assert.strictEqual(raffle.participants[1].tickets, 100);
    }
  });

  it('expecting viewer to have 100 points', async () => {
    await changelog.flush();
    const userFromDb = await AppDataSource.getRepository(User).findOne({ where: { userName: user.viewer.userName } });
    assert.strictEqual(userFromDb.points, 100);
  });

  it('expecting viewer2 to have 150 points', async () => {
    await changelog.flush();
    const userFromDb = await AppDataSource.getRepository(User).findOne({ where: { userName: user.viewer2.userName } });
    assert.strictEqual(userFromDb.points, 150);
  });
});
