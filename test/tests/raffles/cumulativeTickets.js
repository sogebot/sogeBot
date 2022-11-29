/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const commons = require('../../../dest/commons');

const { User } = require('../../../dest/database/entity/user');
const { Raffle } = require('../../../dest/database/entity/raffle');

const raffles = (require('../../../dest/systems/raffles')).default;

const assert = require('assert');
const { IsNull } = require('typeorm');
const { AppDataSource } = require('../../../dest/database.js');

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
