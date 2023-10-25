
/* global describe it before */

import('../../general.js');

import { db, message, user } from '../../general.js';
import * as commons from '../../../dest/commons.js'

import { User } from '../../../dest/database/entity/user.js';
import { Raffle } from '../../../dest/database/entity/raffle.js';

import raffles from '../../../dest/systems/raffles.js';

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';
import { IsNull } from 'typeorm';

describe('Raffles - announce entries if set #4174 - @func2', () => {
  describe('ticket raffle', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      raffles.announceNewEntries = true;
      raffles.announceNewEntriesBatchTime = 10;
    });

    it('create ticket raffle', async () => {
      raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 100' });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-100>". Raffle is opened for everyone.', { userName: '__bot__' })
    });

    it('Update viewer, viewer2, mod to have 200 points', async () => {
      await AppDataSource.getRepository(User).save({ userName: user.viewer.userName, userId: user.viewer.userId, points: 200 });
      await AppDataSource.getRepository(User).save({ userName: user.viewer2.userName, userId: user.viewer2.userId, points: 200 });
      await AppDataSource.getRepository(User).save({ userName: user.mod.userName, userId: user.mod.userId, points: 200 });
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

    it('expecting 150 entries in announce message', async () => {
      await raffles.announceEntries();
      await message.isSentRaw('Added 150 entries to raffle (150 total). To enter type "!winme <1-100>". Raffle is opened for everyone.', { userName: '__bot__' });
    });

    it('Mod bets 50 points', async () => {
      const a = await raffles.participate({ sender: user.mod, message: '!winme 50' });
      assert(a);
    });

    it('expecting 50 new entries and 200 total in announce message', async () => {
      await raffles.announceEntries();
      await message.isSentRaw('Added 50 entries to raffle (200 total). To enter type "!winme <1-100>". Raffle is opened for everyone.', { userName: '__bot__' });
    });
  });

  describe('normal raffle', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      raffles.announceNewEntries = true;
      raffles.announceNewEntriesBatchTime = 10;
    });

    it('create raffle', async () => {
      raffles.open({ sender: user.owner, parameters: '!winme' });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme". Raffle is opened for everyone.', { userName: '__bot__' })
    });

    it('2 viewers participate in raffle', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme' });
      assert(a);
      const b = await raffles.participate({ sender: user.viewer2, message: '!winme' });
      assert(b);
    });

    it('expecting 2 participants in db', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: IsNull(), isClosed: false },
      });
      assert.strictEqual(raffle.participants.length, 2);
    });

    it('expecting 2 entries in announce message', async () => {
      await raffles.announceEntries();
      await message.isSentRaw('Added 2 entries to raffle (2 total). To enter type "!winme". Raffle is opened for everyone.', { userName: '__bot__' });
    });

    it('1 viewers participate in raffle', async () => {
      const a = await raffles.participate({ sender: user.mod, message: '!winme' });
      assert(a);
    });

    it('expecting 1 new entry and 3 total in announce message', async () => {
      await raffles.announceEntries();
      await message.isSentRaw('Added 1 entry to raffle (3 total). To enter type "!winme". Raffle is opened for everyone.', { userName: '__bot__' });
    });
  });
});
