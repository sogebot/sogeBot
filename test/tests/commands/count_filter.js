/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { User } from '../../../dest/database/entity/user.js';

import customcommands from '../../../dest/systems/customcommands.js';

// users
const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };
const user1 = { userName: 'user1', userId: String(Math.floor(Math.random() * 100000)) };

describe('Custom Commands - @func1 - count filter', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
    await AppDataSource.getRepository(User).save({ userName: user1.userName, userId: user1.userId });
  });

  describe('$count(\'!cmd2\') should be properly parsed', () => {
    it('create command and response with $count variable', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !cmd -r Count of !cmd2 is $count(\'!cmd2\') and count of !second $count(\'!second\')' });
      assert.strictEqual(r[0].response, '$sender, command !cmd was added');
    });

    it('create command to increment count', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !cmd2 -r !uptime' });
      assert.strictEqual(r[0].response, '$sender, command !cmd2 was added');
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
      const r = await customcommands.add({ sender: owner, parameters: '-c !cmd3 -r Command usage count: $count' });
      assert.strictEqual(r[0].response, '$sender, command !cmd3 was added');
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
