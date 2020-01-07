/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { linesParsed } = require('../../../dest/helpers/parser');

// users
const owner = { username: 'soge__' };

const timers = (require('../../../dest/systems/timers')).default;

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

describe('Timers - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    const timer = await getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 60,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
    });

    await getRepository(TimerResponse).save({
      response: 'Lorem Ipsum',
      timestamp: Date.now(),
      isEnabled: true,
      timer: timer,
    });
  });

  it('', async () => {
    timers.toggle({ sender: owner, parameters: '' });
    await message.isSent('timers.id-or-name-must-be-defined', owner, { sender: owner.username });
  });

  it('-id something -name something', async () => {
    timers.toggle({ sender: owner, parameters: '-id something -name something' });
    await message.isSent('timers.timer-not-found', owner, { name: 'something', sender: owner.username });
  });

  it('-id unknown', async () => {
    timers.toggle({ sender: owner, parameters: '-id unknown' });
    await message.isSent('timers.id-or-name-must-be-defined', owner, { sender: owner.username });
  });

  it('-id response_id', async () => {
    const response = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum' });
    timers.toggle({ sender: owner, parameters: '-id ' + response.id });
    await message.isSent('timers.response-disabled', owner, { id: response.id, sender: owner.username });

    timers.toggle({ sender: owner, parameters: '-id ' + response.id });
    await message.isSent('timers.response-enabled', owner, { id: response.id, sender: owner.username });
  });

  it('-name unknown', async () => {
    timers.toggle({ sender: owner, parameters: '-name unknown' });
    await message.isSent('timers.timer-not-found', owner, { name: 'unknown', sender: owner.username });
  });

  it('-name test', async () => {
    timers.toggle({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.timer-disabled', owner, { name: 'test', sender: owner.username });

    timers.toggle({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.timer-enabled', owner, { name: 'test', sender: owner.username });
  });
});
