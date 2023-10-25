
/* global describe it before */

import('../../general.js');

import { db, message, user } from '../../general.js';
import * as commons from '../../../dest/commons.js'

import { User } from '../../../dest/database/entity/user.js';
import { Raffle } from '../../../dest/database/entity/raffle.js';

import raffles from '../../../dest/systems/raffles.js';
import { isStreamOnline } from '../../../dest/helpers/api/isStreamOnline.js'

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';
import { IsNull } from 'typeorm';

describe('Raffles - announce should contain delete info #4176 - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    raffles.deleteRaffleJoinCommands = true;
  });

  after(async () => {
    raffles.raffleAnnounceMessageInterval = 20;
    isStreamOnline.value = false;
    raffles.deleteRaffleJoinCommands = false;
  })

  it('create ticket raffle', async () => {
    raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 100' });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-100>". Raffle is opened for everyone. Your raffle messages will be deleted on join.', { userName: '__bot__' })
  });

  it('Update viewer and viewer2 to have 200 points', async () => {
    await AppDataSource.getRepository(User).save({ userName: user.vieweruserName, userId: user.viewer.userId, points: 200 });
    await AppDataSource.getRepository(User).save({ userName: user.viewer2userName, userId: user.viewer2.userId, points: 200 });
  });

  it('Viewer bets max points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
    assert(a);
  });

  it('Viewer2 bets 50 points', async () => {
    const a = await raffles.participate({ sender: user.viewer2, message: '!winme 50' });
    assert(a);
  });

  it('expecting 2 participants to have bet of 100 and 50', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: IsNull(), isClosed: false },
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

  it('expecting 2 entries in announce message', async () => {
    isStreamOnline.value = true;
    raffles.lastAnnounceMessageCount = 0;
    raffles.lastAnnounce = 0;
    raffles.raffleAnnounceMessageInterval = 0;
    await raffles.announce();
    await message.isSentRaw('Raffle is running (150 entries). To enter type "!winme <1-100>". Raffle is opened for everyone. Your raffle messages will be deleted on join.', { userName: '__bot__' })
  });
});
