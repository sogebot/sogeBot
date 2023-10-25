/* global describe it beforeEach */


import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

import timers from '../../../dest/systems/timers.js';

import { Timer } from '../../../dest/database/entity/timer.js';

import { linesParsed } from '../../../dest/helpers/parser.js';
// users
const owner = { userName: '__broadcaster__' };

describe('Timers - unset() - @func2', () => {
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
  });

  it('', async () => {
    const r = await timers.unset({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, timer name must be defined.');
  });
  it('-name test', async () => {
    const r = await timers.unset({ sender: owner, parameters: '-name test' });
    assert.strictEqual(r[0].response, '$sender, timer test and its responses was deleted.');

    const item = await AppDataSource.getRepository(Timer).findOneBy({ name: 'test' });
    assert(item === null);
  });
  it('-name nonexistent', async () => {
    const r = await timers.unset({ sender: owner, parameters: '-name nonexistent' });
    assert.strictEqual(r[0].response, '$sender, timer (name: nonexistent) was not found in database. Check timers with !timers list');

    const item = await AppDataSource.getRepository(Timer).findOneBy({ name: 'test' });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });
});
