/* global describe it beforeEach */


const assert = require('chai').assert;
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const alias = (require('../../../dest/systems/alias')).default;
const customCommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };
const user = { username: 'user', userId: Math.floor(Math.random() * 100000) };

describe('Alias - run()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save({ username: owner.username, userId: owner.userId });
    await getRepository(User).save({ username: user.username, userId: user.userId });
  });

  it('!a should show correctly command with link (skip is true)', async () => {
    alias.add({ sender: owner, parameters: '-a !a -c !test http://google.com' });
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!test http://google.com', sender: owner.username });

    customCommands.add({ sender: owner, parameters: '-c !test -r $param' });
    await message.isSent('customcmds.command-was-added', owner, { response: '$param', command: '!test', sender: owner.username });

    alias.run({ sender: user, message: '!a' });
    await message.isSentRaw('http://google.com', user);
  });

  it('!a will show !duel', async () => {
    alias.add({ sender: owner, parameters: '-a !a -c !duel' });
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!duel', sender: owner.username });

    alias.run({ sender: owner, message: '!a' });
    await message.debug('alias.process', '!duel');

    alias.remove({ sender: owner, parameters: '!a' });
    await message.isSent('alias.alias-was-removed', owner, { alias: '!a', sender: owner.username });

    assert.isEmpty(alias.run({ sender: owner, message: '!a' }));
  });

  it('#668 - alias is case insensitive', async () => {
    alias.add({ sender: owner, parameters: '-a !a -c !duel' });
    await message.isSent('alias.alias-was-added', owner, { alias: '!a', command: '!duel', sender: owner.username });

    alias.run({ sender: owner, message: '!A' });
    await message.debug('alias.process', '!duel');

    alias.remove({ sender: owner, parameters: '!a' });
    await message.isSent('alias.alias-was-removed', owner, { alias: '!a', sender: owner.username });

    assert.isEmpty(alias.run({ sender: owner, message: '!a' }));
  });

  it('!a with spaces - will show !duel', async () => {
    alias.add({ sender: owner, parameters: '-a !a with spaces -c !duel' });
    await message.isSent('alias.alias-was-added', owner, { alias: '!a with spaces', command: '!duel', sender: owner.username });

    alias.run({ sender: owner, message: '!a with spaces' });
    await message.debug('alias.process', '!duel');

    alias.remove({ sender: owner, parameters: '!a with spaces' });
    await message.isSent('alias.alias-was-removed', owner, { alias: '!a with spaces', sender: owner.username });

    assert.isEmpty(alias.run({ sender: owner, message: '!a with spaces' }));
  });

  it('!한국어 - will show !duel', async () => {
    alias.add({ sender: owner, parameters: '-a !한국어 -c !duel' });
    await message.isSent('alias.alias-was-added', owner, { alias: '!한국어', command: '!duel', sender: owner.username });

    alias.run({ sender: owner, message: '!한국어' });
    await message.debug('alias.process', '!duel');

    alias.remove({ sender: owner, parameters: '!한국어' });
    await message.isSent('alias.alias-was-removed', owner, { alias: '!한국어', sender: owner.username });

    assert.isEmpty(alias.run({ sender: owner, message: '!한국어' }));
  });

  it('!русский - will show !duel', async () => {
    alias.add({ sender: owner, parameters: '-a !русский -c !duel' });
    await message.isSent('alias.alias-was-added', owner, { alias: '!русский', command: '!duel', sender: owner.username });

    alias.run({ sender: owner, message: '!русский' });
    await message.debug('alias.process', '!duel');

    alias.remove({ sender: owner, parameters: '!русский' });
    await message.isSent('alias.alias-was-removed', owner, { alias: '!русский', sender: owner.username });

    assert.isEmpty(alias.run({ sender: owner, message: '!русский' }));
  });

  it('!крутить 1000 - will show !gamble 1000', async () => {
    alias.add({ sender: owner, parameters: '-a !крутить -c !gamble' });
    await message.isSent('alias.alias-was-added', owner, { alias: '!крутить', command: '!gamble', sender: owner.username });

    alias.run({ sender: owner, message: '!крутить 1000' });
    await message.debug('alias.process', '!gamble 1000');

    alias.remove({ sender: owner, parameters: '!крутить' });
    await message.isSent('alias.alias-was-removed', owner, { alias: '!крутить', sender: owner.username });

    assert.isEmpty(alias.run({ sender: owner, message: '!крутить' }));
  });
});
