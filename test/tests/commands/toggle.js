/* global describe it beforeEach */
import('../../general.js');

import assert from 'assert';

import customcommands from '../../../dest/systems/customcommands.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Custom Commands - @func1 - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    const r = await customcommands.toggle({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !command');
  });

  it('!unknown', async () => {
    const r = await customcommands.toggle({ sender: owner, parameters: '!unknown' });
    assert.strictEqual(r[0].response, '$sender, command !unknown was not found in database');
  });

  it('!a', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !a -r !uptime' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');

    const r2 = await customcommands.toggle({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, '$sender, command !a was disabled');

    const r3 = await customcommands.toggle({ sender: owner, parameters: '!a' });
    assert.strictEqual(r3[0].response, '$sender, command !a was enabled');
  });

  it('!한글', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !한글 -r !uptime' });
    assert.strictEqual(r[0].response, '$sender, command !한글 was added');

    const r2 = await customcommands.toggle({ sender: owner, parameters: '!한글' });
    assert.strictEqual(r2[0].response, '$sender, command !한글 was disabled');

    const r3 = await customcommands.toggle({ sender: owner, parameters: '!한글' });
    assert.strictEqual(r3[0].response, '$sender, command !한글 was enabled');
  });

  it('!русский', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !русский -r !uptime' });
    assert.strictEqual(r[0].response, '$sender, command !русский was added');

    const r2 = await customcommands.toggle({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r2[0].response, '$sender, command !русский was disabled');

    const r3 = await customcommands.toggle({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r3[0].response, '$sender, command !русский was enabled');
  });
});
