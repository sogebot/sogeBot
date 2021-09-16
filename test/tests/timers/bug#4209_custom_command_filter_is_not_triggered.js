/* global describe it beforeEach */


const assert = require('assert');
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const timers = (require('../../../dest/systems/timers')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const isStreamOnline = (require('../../../dest/helpers/api/isStreamOnline')).isStreamOnline;

const { getRepository } = require('typeorm');
const { Timer, TimerResponse } = require('../../../dest/database/entity/timer');

const { linesParsed } = require('../../../dest/helpers/parser');

// users
const owner = { username: '__broadcaster__' };

describe('Timers - https://github.com/sogehige/sogeBot/issues/4209 - custom command filter is not properly triggered', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });
  after(async () => {
    isStreamOnline.value = false;
  });

  it('Create timer', async () => {
    await getRepository(Timer).save({
      name: 'test',
      triggerEveryMessage: 0,
      triggerEverySecond: 0,
      isEnabled: true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessage: linesParsed,
    });
  });

  it('Add custom command !telemetry', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !telemetry -r Lorem Ipsum Dolor Sit Amet' });
    assert.strictEqual(r[0].response, '$sender, command !telemetry was added');
  });

  it('Add (!telemetry) response to timer', async () => {
    const r = await timers.add({ sender: owner, parameters: '-name test -response "(!telemetry)"' });

    const item = await getRepository(TimerResponse).findOne({ response: '(!telemetry)' });
    assert(typeof item !== 'undefined');

    assert.strictEqual(r[0].response, `$sender, response (id: ${item.id}) for timer (name: test) was added - '(!telemetry)'`);
  });

  it('Set manually stream to be online and manually trigger timers check', () => {
    isStreamOnline.value = true;
    timers.check();
  });

  it('We should have correct response in chat in a while', async () => {
    await message.isSentRaw('Lorem Ipsum Dolor Sit Amet', 'bot', 5000);
  });
});
