/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__' };

describe('Custom Commands - toggle()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('', async () => {
    customcommands.toggle({ sender: owner, parameters: '' });
    await message.isSent('customcmds.commands-parse-failed', owner, { sender: owner.username });
  });

  it('!unknown', async () => {
    customcommands.toggle({ sender: owner, parameters: '-c !unknown' });
    await message.isSent('customcmds.command-was-not-found', owner, { command: '!unknown', sender: owner.username });
  });

  it('!a', async () => {
    customcommands.add({ sender: owner, parameters: '-c !a -r !uptime' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!a', sender: owner.username });

    customcommands.toggle({ sender: owner, parameters: '!a' });
    await message.isSent('customcmds.command-was-disabled', owner, { command: '!a', sender: owner.username });

    customcommands.toggle({ sender: owner, parameters: '!a' });
    await message.isSent('customcmds.command-was-enabled', owner, { command: '!a', sender: owner.username });
  });

  it('!한글', async () => {
    customcommands.add({ sender: owner, parameters: '-c !한글 -r !uptime' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!한글', sender: owner.username });

    customcommands.toggle({ sender: owner, parameters: '!한글' });
    await message.isSent('customcmds.command-was-disabled', owner, { command: '!한글', sender: owner.username });

    customcommands.toggle({ sender: owner, parameters: '!한글' });
    await message.isSent('customcmds.command-was-enabled', owner, { command: '!한글', sender: owner.username });
  });

  it('!русский', async () => {
    customcommands.add({ sender: owner, parameters: '-c !русский -r !uptime' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!русский', sender: owner.username });

    customcommands.toggle({ sender: owner, parameters: '!русский' });
    await message.isSent('customcmds.command-was-disabled', owner, { command: '!русский', sender: owner.username });

    customcommands.toggle({ sender: owner, parameters: '!русский' });
    await message.isSent('customcmds.command-was-enabled', owner, { command: '!русский', sender: owner.username });
  });
});
