/* global describe it beforeEach */


import assert from 'assert';
const { AppDataSource } = require('../../../dest/database.js');
require('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

const timers = (require('../../../dest/systems/timers')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const isStreamOnline = (require('../../../dest/helpers/api/isStreamOnline')).isStreamOnline;

const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');

// users
const owner = { userName: '__broadcaster__' };

describe('Timers - https://github.com/sogehige/sogeBot/issues/4209 - custom command filter is not properly triggered - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });
  after(async () => {
    isStreamOnline.value = false;
  });

  it('Create timer', async () => {
    const timer = new Timer();
    timer.name = 'test';
    timer.triggerEveryMessage = 0;
    timer.triggerEverySecond = 0;
    timer.isEnabled = true;
    timer.triggeredAtTimestamp = Date.now();
    timer.triggeredAtMessage = linesParsed;
    await timer.save();
  });

  it('Add custom command !telemetry', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !telemetry -r Lorem Ipsum Dolor Sit Amet' });
    assert.strictEqual(r[0].response, '$sender, command !telemetry was added');
  });

  it('Add (!telemetry) response to timer', async () => {
    const r = await timers.add({ sender: owner, parameters: '-name test -response "(!telemetry)"' });

    const item = await AppDataSource.getRepository(TimerResponse).findOneBy({ response: '(!telemetry)' });
    assert(typeof item !== 'undefined');

    assert.strictEqual(r[0].response, `$sender, response (id: ${item.id}) for timer (name: test) was added - '(!telemetry)'`);
  });

  it('Set manually stream to be online and manually trigger timers check', () => {
    isStreamOnline.value = true;
    timers.check();
  });

  it('We should have correct response in chat in a while', async () => {
    await message.isSentRaw('Lorem Ipsum Dolor Sit Amet', '__bot__', 5000);
  });
});
