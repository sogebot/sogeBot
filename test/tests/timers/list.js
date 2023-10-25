/* global describe it beforeEach */
import('../../general.js');

import { db } from '../../general.js';
import assert from 'assert';
import { message } from '../../general.js';

import timers from '../../../dest/systems/timers.js';

import { linesParsed } from '../../../dest/helpers/parser.js';

// users
const owner = { userName: '__broadcaster__' };

import { Timer, TimerResponse } from '../../../dest/database/entity/timer.js';
import { AppDataSource } from '../../../dest/database.js';

describe('Timers - list() - @func2', () => {
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

    const timer2 = new Timer();
    timer2.name = 'test2';
    timer2.triggerEveryMessage = 0;
    timer2.triggerEverySecond = 60;
    timer2.tickOffline = false;
    timer2.isEnabled = false;
    timer2.triggeredAtTimestamp = Date.now();
    timer2.triggeredAtMessage = linesParsed;
    await timer2.save();

    const response1 = new TimerResponse()
    response1.isEnabled = true;
    response1.response = 'Lorem Ipsum';
    response1.timer = timer2;
    await response1.save();

    const response2 = new TimerResponse()
    response2.isEnabled = false;
    response2.response = 'Lorem Ipsum 2';
    response2.timer = timer2;
    await response2.save();
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

    const response1 = await AppDataSource.getRepository(TimerResponse).findOneBy({ response: 'Lorem Ipsum' });
    const response2 = await AppDataSource.getRepository(TimerResponse).findOneBy({ response: 'Lorem Ipsum 2' });

    assert.strictEqual(r[0].response, '$sender, timer (name: test2) list');
    assert.strictEqual(r[1].response, `⚫ ${response1.id} - Lorem Ipsum`);
    assert.strictEqual(r[2].response, `⚪ ${response2.id} - Lorem Ipsum 2`);
  });
});
