
/* global describe it before */

import('../../general.js');

import { db, message, user } from '../../general.js';
import * as commons from '../../../dest/commons.js'

import { User } from '../../../dest/database/entity/user.js';
import { Raffle } from '../../../dest/database/entity/raffle.js';

import raffles from '../../../dest/systems/raffles.js';

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

describe('Raffles - allowOverTicketing - @func1', () => {
  describe('Disabled allowOverTicketing', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      raffles.allowOverTicketing = false;
    });

    it('create ticket raffle', async () => {
      raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 500' });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-500>". Raffle is opened for everyone.', { userName: '__bot__' });
    });

    it('Update viewer to have 10 points', async () => {
      await AppDataSource.getRepository(User).save({ userName: user.viewer.userName, userId: user.viewer.userId, points: 10 });
    });

    it('Viewer bets over 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
      assert(a === false);
    });

    it('expecting 0 participant', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 0);
    });

    it('Viewer bets 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 10' });
      assert(a);
    });

    it('expecting 1 participant', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 1);
    });

    it('Participant bet 10 points', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants[0].tickets === 10, `${raffle.participants[0].tickets} != 10`);
    });
  });

  describe('Enabled allowOverTicketing', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      raffles.allowOverTicketing = true;
    });

    after(() => {
      raffles.allowOverTicketing = false;
    });

    it('create ticket raffle', async () => {
      raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 500' });
      await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-500>". Raffle is opened for everyone.', { userName: '__bot__' });
    });

    it('Update viewer to have 10 points', async () => {
      await AppDataSource.getRepository(User).save({ userName: user.viewer.userName, userId: user.viewer.userId, points: 10 });
    });

    it('Viewer bets over 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
      assert(a);
    });

    it('expecting 1 participant', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 1);
    });

    it('Participant bet 10 points', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants[0].tickets === 10, `${raffle.participants[0].tickets} != 10`);
    });

    it('Viewer bets 10 points', async () => {
      const a = await raffles.participate({ sender: user.viewer, message: '!winme 10' });
      assert(a);
    });

    it('expecting 1 participant', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants.length === 1);
    });

    it('Participant bet 10 points', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });
      assert(raffle.participants[0].tickets === 10, `${raffle.participants[0].tickets} != 10`);
    });
  });
});
