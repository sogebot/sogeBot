/* global describe it beforeEach */


const assert = require('assert');
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const timers = (require('../../../dest/systems/timers')).default;

const { getRepository } = require('typeorm');
const { Timer } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');
// users
const owner = { username: 'soge__' };

describe('Timers - unset()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 60,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
    });
  });

  it('', async () => {
    const r = await timers.unset({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, timer name must be defined.');
  });
  it('-name test', async () => {
    const r = await timers.unset({ sender: owner, parameters: '-name test' });
    assert.strictEqual(r[0].response, '$sender, timer test and its responses was deleted.');

    const item = await getRepository(Timer).findOne({ name: 'test' });
    assert(typeof item === 'undefined');
  });
  it('-name nonexistent', async () => {
    const r = await timers.unset({ sender: owner, parameters: '-name nonexistent' });
    assert.strictEqual(r[0].response, '$sender, timer (name: nonexistent) was not found in database. Check timers with !timers list');

    const item = await getRepository(Timer).findOne({ name: 'test' });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });
});
