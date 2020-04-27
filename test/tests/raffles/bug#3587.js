/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const commons = require('../../../dest/commons');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Raffle } = require('../../../dest/database/entity/raffle');

const raffles = (require('../../../dest/systems/raffles')).default;

const assert = require('assert');

describe('Raffles - user will lose points when join raffle with number and all #3587', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    raffles.allowOverTicketing = true;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 100' });
    await message.isSent('raffles.announce-ticket-raffle', { username: 'bot' }, {
      keyword: '!winme',
      eligibility: await commons.prepare('raffles.eligibility-everyone-item'),
      min: 1,
      max: 100,
    });
  });

  it('Update viewer and viewer2 to have 200 points', async () => {
    await getRepository(User).save({ username: user.viewer.username, userId: user.viewer.userId, points: 200 });
    await getRepository(User).save({ username: user.viewer2.username, userId: user.viewer2.userId, points: 200 });
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
    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: null, isClosed: false },
    });
    assert.strictEqual(raffle.participants.length, 2);
    assert.strictEqual(raffle.participants[0].tickets, 100);
    assert.strictEqual(raffle.participants[1].tickets, 50);
  });

  it('expecting viewer to have 100 points', async () => {
    const userFromDb = await getRepository(User).findOne({
      where: { username: user.viewer.username },
    });
    assert.strictEqual(userFromDb.points, 100);
  });

  it('expecting viewer2 to have 150 points', async () => {
    const userFromDb = await getRepository(User).findOne({
      where: { username: user.viewer2.username },
    });
    assert.strictEqual(userFromDb.points, 150);
  });

  it('Viewer bets max points again with all', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme all' });
    assert(a);
  });

  it('Viewer2 bets max points with all', async () => {
    const a = await raffles.participate({ sender: user.viewer2, message: '!winme all' });
    assert(a);
  });

  it('expecting 2 participants to have bet of 100', async () => {
    const raffle = await getRepository(Raffle).findOne({
      relations: ['participants'],
      where: { winner: null, isClosed: false },
    });
    assert.strictEqual(raffle.participants.length, 2);
    assert.strictEqual(raffle.participants[0].tickets, 100);
    assert.strictEqual(raffle.participants[1].tickets, 100);
  });

  it('expecting viewer to still have 100 points', async () => {
    const userFromDb = await getRepository(User).findOne({
      where: { username: user.viewer.username },
    });
    assert.strictEqual(userFromDb.points, 100);
  });

  it('expecting viewer2 to have 100 points', async () => {
    const userFromDb = await getRepository(User).findOne({
      where: { username: user.viewer2.username },
    });
    assert.strictEqual(userFromDb.points, 100);
  });
});
