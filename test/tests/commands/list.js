/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__' };

describe('Custom Commands - list()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('empty list', async () => {
    customcommands.list({ sender: owner, parameters: '' });
    await message.isSent('customcmds.list-is-empty', owner, { sender: owner.username });
  });

  it('populated list', async () => {
    customcommands.add({ sender: owner, parameters: '-p casters -c !a -r me' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!a', sender: owner.username });

    customcommands.add({ sender: owner, parameters: '-p moderators -s true -c !a -r me2' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!a', sender: owner.username });

    customcommands.add({ sender: owner, parameters: '-c !b -r me' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!b', sender: owner.username });

    customcommands.list({ sender: owner, parameters: '' });
    await message.isSent('customcmds.list-is-not-empty', owner, { list: '!a, !b', sender: owner.username });

    customcommands.list({ sender: owner, parameters: '!a' });
    await message.isSentRaw('!a#1 (Casters) v| me', owner, {});
    await message.isSentRaw('!a#2 (Moderators) _| me2', owner, {});
  });
});
