/* global describe it before */


require('../../general.js');
const uuid = require('uuid/v4');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const assert = require('assert');

const { permission } = require('../../../dest/permissions');

// users
const owner = { username: 'soge__', userId: Math.random() };
const user1 = { username: 'user1', userId: Math.random() };

describe('Custom Commands - count filter', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await global.db.engine.insert('users', { username: owner.username, id: owner.userId });
    await global.db.engine.insert('users', { username: user1.username, id: user1.userId });
  });

  describe('$count(\'!cmd2\') should be properly parsed', () => {
    it('create command and response with $count variable', async () => {
      global.systems.customCommands.add({ sender: owner, parameters: '-c !cmd -r Count of !cmd2 is $count(\'!cmd2\') and count of !second $count(\'!second\')' });
      await message.isSent('customcmds.command-was-added', owner, { command: '!cmd', sender: owner.username });
    });

    it('create command to increment count', async () => {
      global.systems.customCommands.add({ sender: owner, parameters: '-c !cmd2 -r !uptime' });
      await message.isSent('customcmds.command-was-added', owner, { command: '!cmd2', sender: owner.username });
    });

    it('$count should be 0', async () => {
      global.systems.customCommands.run({ sender: owner, message: '!cmd' });
      await message.isSentRaw('Count of !cmd2 is 0 and count of !second 0', owner);
    });

    it('0 even second time', async () => {
      global.systems.customCommands.run({ sender: owner, message: '!cmd' });
      await message.isSentRaw('Count of !cmd2 is 0 and count of !second 0', owner);
    });

    it('trigger command to increment count', () => {
      global.systems.customCommands.run({ sender: owner, message: '!cmd2' });
    });

    it('$count should be 1 and 0', async () => {
      global.systems.customCommands.run({ sender: owner, message: '!cmd' });
      await message.isSentRaw('Count of !cmd2 is 1 and count of !second 0', owner);
    });
  });

  describe('$count should be properly parsed', () => {
    it('create command and response with $count variable', async () => {
      global.systems.customCommands.add({ sender: owner, parameters: '-c !cmd3 -r Command usage count: $count' });
      await message.isSent('customcmds.command-was-added', owner, { command: '!cmd3', sender: owner.username });
    });

    it('$count should be 1', async () => {
      global.systems.customCommands.run({ sender: owner, message: '!cmd3' });
      await message.isSentRaw('Command usage count: 1', owner);
    });

    it('$count should be 2', async () => {
      global.systems.customCommands.run({ sender: owner, message: '!cmd3' });
      await message.isSentRaw('Command usage count: 2', owner);
    });
  });
});
