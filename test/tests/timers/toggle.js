/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

// users
const owner = { username: 'soge__' };

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

describe('Timers - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    let timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 60;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = global.linesParsed;
    timer = await getRepository(Timer).save(timer);

    const response = new TimerResponse();
    response.response = 'Lorem Ipsum';
    response.timestamp = Date.now();
    response.isEnabled = true;
    response.timer = timer;
    await getRepository(TimerResponse).save(response);
  });

  it('', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '' });
    await message.isSent('timers.id-or-name-must-be-defined', owner, { sender: owner.username });
  });

  it('-id something -name something', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-id something -name something' });
    await message.isSent('timers.timer-not-found', owner, { name: 'something', sender: owner.username });
  });

  it('-id unknown', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-id unknown' });
    await message.isSent('timers.id-or-name-must-be-defined', owner, { sender: owner.username });
  });

  it('-id response_id', async () => {
    const response = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum' });
    global.systems.timers.toggle({ sender: owner, parameters: '-id ' + response.id });
    await message.isSent('timers.response-disabled', owner, { id: response.id, sender: owner.username });

    global.systems.timers.toggle({ sender: owner, parameters: '-id ' + response.id });
    await message.isSent('timers.response-enabled', owner, { id: response.id, sender: owner.username });
  });

  it('-name unknown', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-name unknown' });
    await message.isSent('timers.timer-not-found', owner, { name: 'unknown', sender: owner.username });
  });

  it('-name test', async () => {
    global.systems.timers.toggle({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.timer-disabled', owner, { name: 'test', sender: owner.username });

    global.systems.timers.toggle({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.timer-enabled', owner, { name: 'test', sender: owner.username });
  });
});
