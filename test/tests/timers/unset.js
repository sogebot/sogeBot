/* global describe it beforeEach */


const assert = require('assert');
const { AppDataSource } = require('../../../dest/database.js');
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const timers = (require('../../../dest/systems/timers')).default;

const { Timer } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');
// users
const owner = { userName: '__broadcaster__' };

describe('Timers - unset() - @func2', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    const timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 60;
    timer.tickOffline = true;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = linesParsed;
    await timer.save();
  });

  it('', async () => {
    const r = await timers.unset({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, timer name must be defined.');
  });
  it('-name test', async () => {
    const r = await timers.unset({ sender: owner, parameters: '-name test' });
    assert.strictEqual(r[0].response, '$sender, timer test and its responses was deleted.');

    const item = await AppDataSource.getRepository(Timer).findOneBy({ name: 'test' });
    assert(item === null);
  });
  it('-name nonexistent', async () => {
    const r = await timers.unset({ sender: owner, parameters: '-name nonexistent' });
    assert.strictEqual(r[0].response, '$sender, timer (name: nonexistent) was not found in database. Check timers with !timers list');

    const item = await AppDataSource.getRepository(Timer).findOneBy({ name: 'test' });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });
});
