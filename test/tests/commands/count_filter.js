/* global describe it before */


require('../../general.js');
const uuid = require('uuid/v4');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const assert = require('assert');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };
const user1 = { username: 'user1', userId: Math.floor(Math.random() * 100000) };

describe('Custom Commands - count filter', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save({ username: owner.username, userId: owner.userId });
    await getRepository(User).save({ username: user1.username, userId: user1.userId });
  });

  describe('$count(\'!cmd2\') should be properly parsed', () => {
    it('create command and response with $count variable', async () => {
      customcommands.add({ sender: owner, parameters: '-c !cmd -r Count of !cmd2 is $count(\'!cmd2\') and count of !second $count(\'!second\')' });
      await message.isSent('customcmds.command-was-added', owner, { command: '!cmd', sender: owner.username });
    });

    it('create command to increment count', async () => {
      customcommands.add({ sender: owner, parameters: '-c !cmd2 -r !uptime' });
      await message.isSent('customcmds.command-was-added', owner, { command: '!cmd2', sender: owner.username });
    });

    it('$count should be 0', async () => {
      customcommands.run({ sender: owner, message: '!cmd' });
      await message.isSentRaw('Count of !cmd2 is 0 and count of !second 0', owner);
    });

    it('0 even second time', async () => {
      customcommands.run({ sender: owner, message: '!cmd' });
      await message.isSentRaw('Count of !cmd2 is 0 and count of !second 0', owner);
    });

    it('trigger command to increment count', () => {
      customcommands.run({ sender: owner, message: '!cmd2' });
    });

    it('$count should be 1 and 0', async () => {
      customcommands.run({ sender: owner, message: '!cmd' });
      await message.isSentRaw('Count of !cmd2 is 1 and count of !second 0', owner);
    });
  });

  describe('$count should be properly parsed', () => {
    it('create command and response with $count variable', async () => {
      customcommands.add({ sender: owner, parameters: '-c !cmd3 -r Command usage count: $count' });
      await message.isSent('customcmds.command-was-added', owner, { command: '!cmd3', sender: owner.username });
    });

    it('$count should be 1', async () => {
      customcommands.run({ sender: owner, message: '!cmd3' });
      await message.isSentRaw('Command usage count: 1', owner);
    });

    it('$count should be 2', async () => {
      customcommands.run({ sender: owner, message: '!cmd3' });
      await message.isSentRaw('Command usage count: 2', owner);
    });
  });
});
