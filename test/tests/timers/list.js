/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const uuid = require('uuid/v4');
const message = require('../../general.js').message;

// users
const owner = { username: 'soge__' };

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/entity/timer');

describe('Timers - list()', () => {
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

    let timer2 = new Timer();
    timer2.name = 'test2';
    timer2.triggerEveryMessage = 0;
    timer2.triggerEverySecond = 60;
    timer2.isEnabled = false;
    timer2.triggeredAtTimestamp = Date.now();
    timer2.triggeredAtMessage = global.linesParsed;
    timer2.responses = [];
    timer2 = await getRepository(Timer).save(timer2);

    const response = new TimerResponse();
    response.response = 'Lorem Ipsum';
    response.timestamp = Date.now();
    response.isEnabled = true;
    response.timer = timer2;
    await getRepository(TimerResponse).save(response);

    const response2 = new TimerResponse();
    response2.response = 'Lorem Ipsum 2';
    response2.timestamp = Date.now();
    response2.isEnabled = false;
    response2.timer = timer2;
    await getRepository(TimerResponse).save(response2);
  });

  it('', async () => {
    global.systems.timers.list({ sender: owner, parameters: '' });
    await message.isSentRaw(`@${owner.username}, timers list: ⚫ test, ⚪ test2`, owner);
  });

  it('-name unknown', async () => {
    global.systems.timers.list({ sender: owner, parameters: '-name unknown' });
    await message.isSent('timers.timer-not-found', owner, { name: 'unknown', sender: owner.username });
  });

  it('-name test2', async () => {
    global.systems.timers.list({ sender: owner, parameters: '-name test2' });

    const response1 = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum' });
    const response2 = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum 2' });

    await message.isSent('timers.responses-list', owner, { name: 'test2', sender: owner.username });
    await message.isSentRaw([
      `⚫ ${response1.id} - ${response1.response}`,
      `⚪ ${response2.id} - ${response2.response}`], owner, { name: 'test2', sender: owner.username });
    await message.isSentRaw([
      `⚫ ${response1.id} - ${response1.response}`,
      `⚪ ${response2.id} - ${response2.response}`], owner, { name: 'test2', sender: owner.username });
  });
});
