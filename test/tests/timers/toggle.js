/* global describe it beforeEach */
require('../../general.js');
const assert = require('assert');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { linesParsed } = require('../../../dest/helpers/parser');

// users
const owner = { userName: '__broadcaster__' };

const timers = (require('../../../dest/systems/timers')).default;

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

describe('Timers - toggle() - @func2', () => {
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

    const response1 = new TimerResponse()
    response1.isEnabled = true;
    response1.response = 'Lorem Ipsum';
    response1.timer = timer;
    await response1.save();
  });

  it('', async () => {
    const r = await timers.toggle({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, response id or timer name must be defined.');
  });

  it('-id something -name something', async () => {
    const r = await timers.toggle({ sender: owner, parameters: '-id something -name something' });
    assert.strictEqual(r[0].response, '$sender, timer (name: something) was not found in database. Check timers with !timers list');
  });

  it('-id unknown', async () => {
    const r = await timers.toggle({ sender: owner, parameters: '-id unknown' });
    assert.strictEqual(r[0].response, '$sender, response id or timer name must be defined.');
  });

  it('-id response_id', async () => {
    const response = await TimerResponse.findOne({ response: 'Lorem Ipsum' });
    const r1 = await timers.toggle({ sender: owner, parameters: '-id ' + response.id });
    assert.strictEqual(r1[0].response, `$sender, response (id: ${response.id}) was disabled`);

    const r2 = await timers.toggle({ sender: owner, parameters: '-id ' + response.id });
    assert.strictEqual(r2[0].response, `$sender, response (id: ${response.id}) was enabled`);
  });

  it('-name unknown', async () => {
    const r = await timers.toggle({ sender: owner, parameters: '-name unknown' });
    assert.strictEqual(r[0].response, '$sender, timer (name: unknown) was not found in database. Check timers with !timers list');
  });

  it('-name test', async () => {
    const r1 = await timers.toggle({ sender: owner, parameters: '-name test' });
    assert.strictEqual(r1[0].response, '$sender, timer (name: test) was disabled');

    const r2 = await timers.toggle({ sender: owner, parameters: '-name test' });
    assert.strictEqual(r2[0].response, '$sender, timer (name: test) was enabled');
  });
});
