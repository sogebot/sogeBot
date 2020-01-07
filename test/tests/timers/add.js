/* global describe it beforeEach */


const assert = require('chai').assert;
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const timers = (require('../../../dest/systems/timers')).default;

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');

// users
const owner = { username: 'soge__' };

describe('Timers - add()', () => {
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
    timers.add({ sender: owner, parameters: '' });
    await message.isSent('timers.name-must-be-defined', owner, { sender: owner.username });
  });

  it('-name test', async () => {
    timers.add({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.response-must-be-defined', owner, { sender: owner.username });
  });

  it('-name unknown -response "Lorem Ipsum"', async () => {
    timers.add({ sender: owner, parameters: '-name unknown -response "Lorem Ipsum"' });
    await message.isSent('timers.timer-not-found', owner, { name: 'unknown', sender: owner.username });
  });

  it('-name test -response "Lorem Ipsum"', async () => {
    await timers.add({ sender: owner, parameters: '-name test -response "Lorem Ipsum"' });

    const item = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum' });
    assert.isTrue(typeof item !== 'undefined');

    await message.isSent('timers.response-was-added', owner, { id: item.id, name: 'test', response: 'Lorem Ipsum', sender: owner.username });
  });
});
