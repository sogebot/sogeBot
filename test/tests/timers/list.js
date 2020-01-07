/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const uuid = require('uuid/v4');
const message = require('../../general.js').message;

const timers = (require('../../../dest/systems/timers')).default;

const { linesParsed } = require('../../../dest/helpers/parser');

// users
const owner = { username: 'soge__' };

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

describe('Timers - list()', () => {
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

    const timer2 = await getRepository(Timer).save({
      name: 'test2',
      triggerEveryMessage: 0,
      triggerEverySecond: 60,
      isEnabled: false,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
    });

    await getRepository(TimerResponse).save({
      response: 'Lorem Ipsum',
      timestamp: Date.now(),
      isEnabled: true,
      timer: timer2,
    });
    await getRepository(TimerResponse).save({
      response: 'Lorem Ipsum 2',
      timestamp: Date.now(),
      isEnabled: false,
      timer: timer2,
    });
  });

  it('', async () => {
    timers.list({ sender: owner, parameters: '' });
    await message.isSentRaw(`@${owner.username}, timers list: ⚫ test, ⚪ test2`, owner);
  });

  it('-name unknown', async () => {
    timers.list({ sender: owner, parameters: '-name unknown' });
    await message.isSent('timers.timer-not-found', owner, { name: 'unknown', sender: owner.username });
  });

  it('-name test2', async () => {
    timers.list({ sender: owner, parameters: '-name test2' });

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
