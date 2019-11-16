/* global describe it beforeEach */


const assert = require('chai').assert;
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

// users
const owner = { username: 'soge__' };

describe('Timers - add()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    const timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 60;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = global.linesParsed;
    await getRepository(Timer).save(timer);
  });

  it('', async () => {
    global.systems.timers.add({ sender: owner, parameters: '' });
    await message.isSent('timers.name-must-be-defined', owner, { sender: owner.username });
  });

  it('-name test', async () => {
    global.systems.timers.add({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.response-must-be-defined', owner, { sender: owner.username });
  });

  it('-name unknown -response "Lorem Ipsum"', async () => {
    global.systems.timers.add({ sender: owner, parameters: '-name unknown -response "Lorem Ipsum"' });
    await message.isSent('timers.timer-not-found', owner, { name: 'unknown', sender: owner.username });
  });

  it('-name test -response "Lorem Ipsum"', async () => {
    await global.systems.timers.add({ sender: owner, parameters: '-name test -response "Lorem Ipsum"' });

    const item = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum' });
    assert.isTrue(typeof item !== 'undefined');

    await message.isSent('timers.response-was-added', owner, { id: item.id, name: 'test', response: 'Lorem Ipsum', sender: owner.username });
  });
});
