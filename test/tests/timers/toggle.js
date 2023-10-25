/* global describe it beforeEach */
import('../../general.js');
import assert from 'assert';

import { db } from '../../general.js';
import { message } from '../../general.js';

import { linesParsed } from '../../../dest/helpers/parser.js';

// users
const owner = { userName: '__broadcaster__' };

import timers from '../../../dest/systems/timers.js';

import { Timer, TimerResponse } from '../../../dest/database/entity/timer.js';

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
    const response = await TimerResponse.findOneBy({ response: 'Lorem Ipsum' });
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
