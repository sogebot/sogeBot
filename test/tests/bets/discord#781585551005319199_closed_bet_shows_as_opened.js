/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const bets = (require('../../../dest/systems/bets')).default;
const { Bets } = require('../../../dest/database/entity/bets');

const assert = require('assert');

// users
const owner = { userName: '__broadcaster__' };

describe('Bets - @func3 - closed bet shows as opened | https://discord.com/channels/317348946144002050/317349069024395264/781585551005319199', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Seed database with closed bet', async () => {
    await new Bets({
      arePointsGiven: true,
      createdAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      isLocked: true,
      options: ['a', 'b'],
      title: 'test',
    }).save();
  });

  it('!bet should not show any running bet', async () => {
    const r = await bets.info({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, 'No bet is currently opened, ask mods to open it!');
  });

  it('!bet participate should not show any running bet', async () => {
    const r = await bets.participate({ sender: owner, parameters: '1' });
    assert.strictEqual(r[0].response, 'No bet is currently opened, ask mods to open it!');
  });

});