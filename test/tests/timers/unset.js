/* global describe it beforeEach */


const assert = require('chai').assert;
require('../../general.js');
const uuid = require('uuid/v4');

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

    const timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 60;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = linesParsed;
    await getRepository(Timer).save(timer);
  });

  it('', async () => {
    timers.unset({ sender: owner, parameters: '' });
    await message.isSent('timers.name-must-be-defined', owner, { name: 'unknown', sender: owner.username });
  });
  it('-name test', async () => {
    timers.unset({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.timer-deleted', owner, { name: 'test', sender: owner.username });

    const item = await getRepository(Timer).findOne({ name: 'test' });
    assert.isUndefined(item);
  });
  it('-name nonexistent', async () => {
    timers.unset({ sender: owner, parameters: '-name nonexistent' });
    await message.isSent('timers.timer-not-found', owner, { name: 'nonexistent', sender: owner.username });

    const item = await getRepository(Timer).findOne({ name: 'test' });
    assert.equal(item.triggerEverySecond, 60);
    assert.equal(item.triggerEveryMessage, 0);
  });
});
