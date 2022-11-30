/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

const bets = (require('../../../dest/systems/bets')).default;

const { Bets } = require('../../../dest/database/entity/bets');
const { User } = require('../../../dest/database/entity/user');

const assert = require('assert');
const { AppDataSource } = require('../../../dest/database.js');

describe('Bets - @func3 - bet should automatically be locked after given time with participants', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await AppDataSource.getRepository(User).save({ userName: user.owner.userName , userId: user.owner.userId, points: 100 });
  });

  it('Seed database with soon to be closed bet', async () => {
    await new Bets({
      arePointsGiven: true,
      createdAt: new Date().toISOString(),
      endedAt: new Date(Date.now() + 1000).toISOString(),
      isLocked: false,
      options: ['a', 'b'],
      title: 'test',
    }).save()
  });

  it('!bet participate should be OK', async () => {
    const r = await bets.participate({ sender: user.owner, parameters: '1 10' });
    assert.strictEqual(r.length, 0);
  });

  it('Bet should properly announce lock', async () => {
    await message.isSentRaw('Betting time is up! No more bets.', '__bot__', 20000);
  });

  it('Bet should be locked in db', async () => {
    const currentBet = (await Bets.find({
      order: { createdAt: 'DESC' },
    }))[0];
    assert(currentBet.isLocked, 'Bet was not locked after 15 seconds.');
  });

  it('!bet should not show any running bet', async () => {
    const r = await bets.info({ sender: user.owner, parameters: '' });
    assert.strictEqual(r[0].response, 'No bet is currently opened, ask mods to open it!');
  });

  it('!bet participate should not show any running bet', async () => {
    const r = await bets.participate({ sender: user.owner, parameters: '1' });
    assert.strictEqual(r[0].response, 'No bet is currently opened, ask mods to open it!');
  });

});