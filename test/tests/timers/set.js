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
    timers.set({ sender: owner, parameters: '' });
    await message.isSent('timers.name-must-be-defined', owner, { name: 'unknown', sender: owner.username });
  });

  it('-name test', async () => {
    await timers.set({ sender: owner, parameters: '-name test' });
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 0, seconds: 60, sender: owner.username });

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });

  it('-name test -seconds 20', async () => {
    await timers.set({ sender: owner, parameters: '-name test -seconds 20' });
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 0, seconds: 20, sender: owner.username });

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 20);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });

  it('-name test -seconds 0', async () => {
    await timers.set({ sender: owner, parameters: '-name test -seconds 0' });
    await message.isSent('timers.cannot-set-messages-and-seconds-0', owner, { sender: owner.username });
    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert(typeof item === 'undefined');
  });

  it('-name test -messages 20', async () => {
    await timers.set({ sender: owner, parameters: '-name test -messages 20' });
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 20, seconds: 60, sender: owner.username });

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 20);
  });

  it('-name test -messages 0', async () => {
    await timers.set({ sender: owner, parameters: '-name test -messages 0' });
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 0, seconds: 60, sender: owner.username });

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 60);
    assert.strictEqual(item.triggerEveryMessage, 0);
  });

  it('-name test -seconds 0 -messages 0', async () => {
    await timers.set({ sender: owner, parameters: '-name test -seconds 0 -messages 0' });
    await message.isSent('timers.cannot-set-messages-and-seconds-0', owner, { sender: owner.username });

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert(typeof item === 'undefined');
  });

  it('-name test -seconds 5 -messages 6', async () => {
    await timers.set({ sender: owner, parameters: '-name test -seconds 5 -messages 6' });
    await message.isSent('timers.timer-was-set', owner, { name: 'test', messages: 6, seconds: 5, sender: owner.username });

    const item = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name: 'test' },
    });
    assert.strictEqual(item.triggerEverySecond, 5);
    assert.strictEqual(item.triggerEveryMessage, 6);
  });
});
