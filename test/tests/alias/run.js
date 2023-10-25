/* global describe it beforeEach afterEach */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

import { User } from '../../../dest/database/entity/user.js';
import alias from '../../../dest/systems/alias.js';
import duel from '../../../dest/games/duel.js'
import gamble from '../../../dest/games/gamble.js'
import customCommands from '../../../dest/systems/customcommands.js'

// users
const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };
const user = { userName: 'user', userId: String(Math.floor(Math.random() * 100000)) };

describe('Alias - @func1 - run()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
    await AppDataSource.getRepository(User).save({ userName: user.userName, userId: user.userId });

    duel.enabled = true;
    gamble.enabled = true;
  });

  afterEach(() => {
    duel.enabled = false;
    gamble.enabled = false;
  });

  it('!a should show correctly command with link (skip is true)', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !test http://google.com' });
    const r2 = await customCommands.add({ sender: owner, parameters: '-c !test -r $param' });

    alias.run({ sender: user, message: '!a' });
    await message.debug('alias.process', '!test http://google.com');

    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!test http://google.com' }));
    assert.strictEqual(r2[0].response, prepare('customcmds.command-was-added', { response: '$param', command: '!test' }));
  });

  it('!a will show !duel', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !duel' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!duel' }));

    alias.run({ sender: owner, message: '!a' });
    await message.debug('sendMessage.message', '@__broadcaster__, you need to specify points to dueling');

    const r2 = await alias.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!a' }));

    assert(await alias.run({ sender: owner, message: '!a' }));
  });

  it('#668 - alias is case insensitive', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a -c !duel' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a', command: '!duel' }));

    alias.run({ sender: owner, message: '!A' });
    await message.debug('sendMessage.message', '@__broadcaster__, you need to specify points to dueling');

    const r2 = await alias.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!a' }));

    assert(await alias.run({ sender: owner, message: '!a' }));
  });

  it('!a with spaces - will show !duel', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !a with spaces -c !duel' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!a with spaces', command: '!duel' }));

    alias.run({ sender: owner, message: '!a with spaces' });
    await message.debug('sendMessage.message', '@__broadcaster__, you need to specify points to dueling');

    const r2 = await alias.remove({ sender: owner, parameters: '!a with spaces' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!a with spaces' }));

    assert(await alias.run({ sender: owner, message: '!a with spaces' }));
  });

  it('!한국어 - will show !duel', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !한국어 -c !duel' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!한국어', command: '!duel' }));

    alias.run({ sender: owner, message: '!한국어' });
    await message.debug('sendMessage.message', '@__broadcaster__, you need to specify points to dueling');

    const r2 = await alias.remove({ sender: owner, parameters: '!한국어' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!한국어' }));

    assert(await alias.run({ sender: owner, message: '!한국어' }));
  });

  it('!русский - will show !duel', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !русский -c !duel' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!русский', command: '!duel' }));

    alias.run({ sender: owner, message: '!русский' });
    await message.debug('sendMessage.message', '@__broadcaster__, you need to specify points to dueling');

    const r2 = await alias.remove({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!русский' }));

    assert(await alias.run({ sender: owner, message: '!русский' }));
  });

  it('!крутить 1000 - will show !gamble 1000', async () => {
    const r = await alias.add({ sender: owner, parameters: '-a !крутить -c !gamble' });
    assert.strictEqual(r[0].response, prepare('alias.alias-was-added', { alias: '!крутить', command: '!gamble' }));

    alias.run({ sender: owner, message: '!крутить 1000' });
    await message.debug('sendMessage.message', '@__broadcaster__, you don\'t have 1000 points to gamble');

    const r2 = await alias.remove({ sender: owner, parameters: '!крутить' });
    assert.strictEqual(r2[0].response, prepare('alias.alias-was-removed', { alias: '!крутить' }));

    assert(await alias.run({ sender: owner, message: '!крутить' }));
  });
});
