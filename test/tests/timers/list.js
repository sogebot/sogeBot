/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const assert = require('assert');
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
    const r = await timers.list({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, timers list: ⚫ test, ⚪ test2');
  });

  it('-name unknown', async () => {
    const r = await timers.list({ sender: owner, parameters: '-name unknown' });
    assert.strictEqual(r[0].response, '$sender, timer (name: unknown) was not found in database. Check timers with !timers list');
  });

  it('-name test2', async () => {
    const r = await timers.list({ sender: owner, parameters: '-name test2' });

    const response1 = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum' });
    const response2 = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum 2' });

    assert.strictEqual(r[0].response, '$sender, timer (name: test2) list');
    assert.strictEqual(r[1].response, `⚫ ${response1.id} - Lorem Ipsum`);
    assert.strictEqual(r[2].response, `⚪ ${response2.id} - Lorem Ipsum 2`);
  });
});
