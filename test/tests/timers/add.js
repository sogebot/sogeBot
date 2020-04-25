/* global describe it beforeEach */


const assert = require('assert');
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
    const r = await timers.add({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, timer name must be defined.');
  });

  it('-name test', async () => {
    const r = await timers.add({ sender: owner, parameters: '-name test' });
    assert.strictEqual(r[0].response, '$sender, timer response must be defined.');
  });

  it('-name unknown -response "Lorem Ipsum"', async () => {
    const r = await timers.add({ sender: owner, parameters: '-name unknown -response "Lorem Ipsum"' });
    assert.strictEqual(r[0].response, '$sender, timer (name: unknown) was not found in database. Check timers with !timers list');
  });

  it('-name test -response "Lorem Ipsum"', async () => {
    const r = await timers.add({ sender: owner, parameters: '-name test -response "Lorem Ipsum"' });

    const item = await getRepository(TimerResponse).findOne({ response: 'Lorem Ipsum' });
    assert(typeof item !== 'undefined');

    assert.strictEqual(r[0].response, `$sender, response (id: ${item.id}) for timer (name: test) was added - 'Lorem Ipsum'`);
  });
});
