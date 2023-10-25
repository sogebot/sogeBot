/* global describe it beforeEach */
import('../../general.js');
import assert from 'assert';

import { db, message, user } from '../../general.js';

import customcommands from '../../../dest/systems/customcommands.js';

describe('Custom Commands - @func1 - remove()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('', async () => {
    const r = await customcommands.remove({ sender: user.owner, parameters: '' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !command');
  });

  it('!alias', async () => {
    const r = await customcommands.remove({ sender: user.owner, parameters: '-c !alias' });
    assert.strictEqual(r[0].response, '$sender, command !alias was not found in database');
  });

  it('alias', async () => {
    const r = await customcommands.remove({ sender: user.owner, parameters: '-c alias' });
    assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !command');
  });

  it('!a', async () => {
    const r = await customcommands.add({ sender: user.owner, parameters: '-c !a -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');

    const r2 = await customcommands.remove({ sender: user.owner, parameters: '-c !a' });
    assert.strictEqual(r2[0].response, '$sender, command !a was removed');
  });

  it('!한글', async () => {
    const r = await customcommands.add({ sender: user.owner, parameters: '-c !한글 -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !한글 was added');

    const r2 = await customcommands.remove({ sender: user.owner, parameters: '-c !한글' });
    assert.strictEqual(r2[0].response, '$sender, command !한글 was removed');
  });

  it('!русский', async () => {
    const r = await customcommands.add({ sender: user.owner, parameters: '-c !русский -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !русский was added');

    const r2 = await customcommands.remove({ sender: user.owner, parameters: '-c !русский' });
    assert.strictEqual(r2[0].response, '$sender, command !русский was removed');
  });

  it('2x - !a !me', async () => {
    const r = await customcommands.add({ sender: user.owner, parameters: '-c !a -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');

    const r2 = await customcommands.remove({ sender: user.owner, parameters: '-c !a' });
    assert.strictEqual(r2[0].response, '$sender, command !a was removed');

    const r3 = await customcommands.remove({ sender: user.owner, parameters: '-c !a' });
    assert.strictEqual(r3[0].response, '$sender, command !a was not found in database');
  });

  it('remove response', async () => {
    const r = await customcommands.add({ sender: user.owner, parameters: '-c !a -r !me' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');
    const r2 = await customcommands.add({ sender: user.owner, parameters: '-c !a -r !me2' });
    assert.strictEqual(r2[0].response, '$sender, command !a was added');

    const r3 = await customcommands.remove({ sender: user.owner, parameters: '-c !a -rid 1' });
    assert.strictEqual(r3[0].response, '$sender, response #1 of !a was removed');

    await customcommands.run({ sender: user.owner, message: '!a', parameters: '' });
    await message.isSentRaw('!me2', user.owner);
  });
});
