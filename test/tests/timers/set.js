/* global describe it beforeEach */


const assert = require('assert');
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const timers = (require('../../../dest/systems/timers')).default;

const { getRepository } = require('typeorm');
const { Timer } = require('../../../dest/database/entity/timer');

// users
const owner = { username: 'soge__' };

describe('Timers - set()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await timers.set({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, '$sender, timer name must be defined.');
  });

  it('-name test', async () => {
    const r = await timers.set({ sender: owner, parameters: '-name test' });
    assert.strictEqual(r[0].response, '$sender, timer test was set with 0 messages and 60 seconds to trigger');

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });

  it('-name test -seconds 20', async () => {
    const r = await timers.set({ sender: owner, parameters: '-name test -seconds 20' });
    assert.strictEqual(r[0].response, '$sender, timer test was set with 0 messages and 20 seconds to trigger');

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 20);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });

  it('-name test -seconds 0', async () => {
    const r = await timers.set({ sender: owner, parameters: '-name test -seconds 0' });
    assert.strictEqual(r[0].response, '$sender, you cannot set both messages and seconds to 0.');
    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert(typeof item === 'undefined');
  });

  it('-name test -messages 20', async () => {
    const r = await timers.set({ sender: owner, parameters: '-name test -messages 20' });
    assert.strictEqual(r[0].response, '$sender, timer test was set with 20 messages and 60 seconds to trigger');

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 20);
  });

  it('-name test -messages 0', async () => {
    const r = await timers.set({ sender: owner, parameters: '-name test -messages 0' });
    assert.strictEqual(r[0].response, '$sender, timer test was set with 0 messages and 60 seconds to trigger');

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });

  it('-name test -seconds 0 -messages 0', async () => {
    const r = await timers.set({ sender: owner, parameters: '-name test -seconds 0 -messages 0' });
    assert.strictEqual(r[0].response, '$sender, you cannot set both messages and seconds to 0.');

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert(typeof item === 'undefined');
  });

  it('-name test -seconds 5 -messages 6', async () => {
    const r = await timers.set({ sender: owner, parameters: '-name test -seconds 5 -messages 6' });
    assert.strictEqual(r[0].response, '$sender, timer test was set with 6 messages and 5 seconds to trigger');

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 5);
    assert.strictEqual(item.triggerEveryMessage, 6);
  });
});
