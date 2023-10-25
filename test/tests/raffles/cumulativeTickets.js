
/* global describe it before */

import('../../general.js');

import { db, message, user } from '../../general.js';
import * as commons from '../../../dest/commons.js'

import { User } from '../../../dest/database/entity/user.js';
import { Raffle } from '../../../dest/database/entity/raffle.js';

import raffles from '../../../dest/systems/raffles.js';

import assert from 'assert';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../../../dest/database.js';

describe('Raffles - cumulativeTickets - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    raffles.allowOverTicketing = true;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 500' });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-500>". Raffle is opened for everyone.', { userName: '__bot__' });
  });

  it('Update viewer to have 25 points', async () => {
    await AppDataSource.getRepository(User).save({ userName: user.viewer.userName, userId: user.viewer.userId, points: 25 });
  });

  it('Viewer bets 10 points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 10' });
    assert(a);
  });

  it('expecting 1 participant', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants.length === 1);
  });

  it('Participant bet 10 points', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants[0].tickets === 10, `${raffle.participants[0].tickets} != 10`);
  });

  it('Viewer bets another 10 points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 10' });
    assert(a);
  });

  it('expecting 1 participant', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants.length === 1);
  });

  it('Participant bet 20 points', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants[0].tickets === 20, `${raffle.participants[0].tickets} != 20`);
  });

  it('Viewer bets another 10 points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 10' });
    assert(a);
  });

  it('expecting 1 participant', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants.length === 1);
  });

  it('Participant bet 25 points', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants[0].tickets === 25, `${raffle.participants[0].tickets} != 25`);
  });
});
