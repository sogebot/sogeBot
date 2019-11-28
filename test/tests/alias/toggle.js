/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const alias = (require('../../../dest/systems/alias')).default;

// users
const owner = { username: 'soge__' };

describe('Alias - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    alias.toggle({ sender: owner, parameters: '' });
    await message.isSent('alias.alias-parse-failed', owner, { sender: owner.username });
  });

  it('!unknown', async () => {
    alias.toggle({ sender: owner, parameters: '!unknown' });
    await message.isSent('alias.alias-was-not-found', owner, { sender: owner.username, alias: '!unknown' });
  });

  it('!a', async () => {
    alias.add({ sender: owner, parameters: '-a !a -c !uptime' });
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!a', command: '!uptime' });

    alias.toggle({ sender: owner, parameters: '!a' });
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!a' });

    alias.toggle({ sender: owner, parameters: '!a' });
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!a' });
  });

  it('!a with spaces', async () => {
    alias.add({ sender: owner, parameters: '-a !a with spaces -c !uptime' });
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!a with spaces', command: '!uptime' });

    alias.toggle({ sender: owner, parameters: '!a with spaces' });
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!a with spaces' });

    alias.toggle({ sender: owner, parameters: '!a with spaces' });
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!a with spaces' });
  });

  it('!한국어', async () => {
    alias.add({ sender: owner, parameters: '-a !한국어 -c !uptime' });
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!한국어', command: '!uptime' });

    alias.toggle({ sender: owner, parameters: '!한국어' });
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!한국어' });

    alias.toggle({ sender: owner, parameters: '!한국어' });
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!한국어' });
  });

  it('!русский', async () => {
    alias.add({ sender: owner, parameters: '-a !русский -c !uptime' });
    await message.isSent('alias.alias-was-added', owner, { sender: owner.username, alias: '!русский', command: '!uptime' });

    alias.toggle({ sender: owner, parameters: '!русский' });
    await message.isSent('alias.alias-was-disabled', owner, { sender: owner.username, alias: '!русский' });

    alias.toggle({ sender: owner, parameters: '!русский' });
    await message.isSent('alias.alias-was-enabled', owner, { sender: owner.username, alias: '!русский' });
  });
});
