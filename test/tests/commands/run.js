import assert from 'assert';

import { Commands } from '../../../dest/database/entity/commands.js';
import { User } from '../../../dest/database/entity/user.js';
import { defaultPermissions } from '../../../dest/helpers/permissions/defaultPermissions.js';
import { AppDataSource } from '../../../dest/database.js'
import customcommands from '../../../dest/systems/customcommands.js';

import('../../general.js');
import { db } from '../../general.js';
import { message } from '../../general.js';

// users
const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };
const user1 = { userName: 'user1', userId: String(Math.floor(Math.random() * 100000)) };

describe('Custom Commands - @func1 - run()', () => {
  before(async () => {
    await db.cleanup();
    message.prepare();

    await AppDataSource.getRepository(User).save({ userName: owner.userName, userId: owner.userId });
    await AppDataSource.getRepository(User).save({ userName: user1.userName, userId: user1.userId });
  });

  describe('\'!test qwerty\' should trigger correct commands', () => {
    it('create \'!test\' command with $_variable', async () => {
      const command = new Commands();
      command.command =   '!test';
      command.enabled =   true;
      command.visible =   true;
      command.group =     null;
      command.responses = [{
        filter: '', response: '$_variable', permission: defaultPermissions.VIEWERS, stopIfExecuted: false, order: 0,
      }];
      await command.save();
    });
    it('create \'!test\' command with $param', async () => {
      const command = new Commands();
      command.command =   '!test';
      command.enabled =   true;
      command.visible =   true;
      command.group =     null;
      command.responses = [{
        filter: '', response: '$param by !test command with param', permission: defaultPermissions.VIEWERS, stopIfExecuted: false, order: 0,
      }];
      await command.save();
    });
    it('create \'!test\' command without $param', async () => {
      const command = new Commands();
      command.command =   '!test';
      command.enabled =   true;
      command.visible =   true;
      command.group =     null;
      command.responses = [{
        filter: '!$haveParam', response: 'This should not be triggered', permission: defaultPermissions.VIEWERS, stopIfExecuted: false, order: 0,
      }];
      await command.save();
    });
    it('create \'!test qwerty\' command without $param', async () => {
      const command = new Commands();
      command.command =   '!test qwerty';
      command.enabled =   true;
      command.visible =   true;
      command.group =     null;
      command.responses = [{
        filter: '', response: 'This should be triggered', permission: defaultPermissions.VIEWERS, stopIfExecuted: false, order: 0,
      }];
      await command.save();
    });
    it('create second \'!test qwerty\' command without $param', async () => {
      const command = new Commands();
      command.command =   '!test qwerty';
      command.enabled =   true;
      command.visible =   true;
      command.group =     null;
      command.responses = [{
        filter: '', response: 'This should be triggered as well', permission: defaultPermissions.VIEWERS, stopIfExecuted: false, order: 0,
      }];
      await command.save();
    });

    it('run command by owner', async () => {
      await customcommands.run({ sender: owner, message: '!test qwerty', parameters: 'qwerty' });
      await message.isSentRaw('qwerty by !test command with param', owner);
      await message.isSentRaw('@__broadcaster__, $_variable was set to qwerty.', owner);
      await message.isSentRaw('This should be triggered', owner);
      await message.isSentRaw('This should be triggered as well', owner);
      await message.isNotSentRaw('This should not be triggered', owner);
    });

    it('run command by viewer', async () => {
      await customcommands.run({ sender: user1, message: '!test qwerty', parameters: 'qwerty' });
      await message.isSentRaw('This should be triggered', user1);
      await message.isSentRaw('This should be triggered as well', user1);
      await message.isSentRaw('qwerty by !test command with param', user1);
      await message.isNotSentRaw('This should not be triggered', user1);
      await message.isNotSentRaw('@user1, $_variable was set to qwerty.', user1);
    });
  });

  describe('!cmd with username filter', () => {
    beforeEach(async () => {
      await message.prepare();
    });
    it('create command and response with filter', async () => {
      const command = new Commands();
      command.command =   '!cmd';
      command.enabled =   true;
      command.visible =   true;
      command.group =     null;
      command.responses = [{
        filter: '$sender == "user1"', response: 'Lorem Ipsum', permission: defaultPermissions.VIEWERS, stopIfExecuted: false, order: 0,
      }];
      await command.save();
    });

    it('run command as user not defined in filter', async () => {
      customcommands.run({ sender: owner, message: '!cmd', parameters: '' });
      await message.isNotSentRaw('Lorem Ipsum', owner);
    });

    it('run command as user defined in filter', async () => {
      customcommands.run({ sender: user1, message: '!cmd', parameters: '' });
      await message.isSentRaw('Lorem Ipsum', user1);
    });
  });

  it('!a will show Lorem Ipsum', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' });
    assert.strictEqual(r[0].response, '$sender, command !a was added');

    customcommands.run({ sender: owner, message: '!a', parameters: '' });
    await message.isSentRaw('Lorem Ipsum', owner);

    const r2 = await customcommands.remove({ sender: owner, parameters: '-c !a' });
    assert.strictEqual(r2[0].response, '$sender, command !a was removed');
  });

  it('!한글 will show Lorem Ipsum', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !한글 -r Lorem Ipsum' });
    assert.strictEqual(r[0].response, '$sender, command !한글 was added');

    customcommands.run({ sender: owner, message: '!한글', parameters: '' });
    await message.isSentRaw('Lorem Ipsum', owner);

    const r2 = await customcommands.remove({ sender: owner, parameters: '-c !한글' });
    assert.strictEqual(r2[0].response, '$sender, command !한글 was removed');
  });

  it('!русский will show Lorem Ipsum', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !русский -r Lorem Ipsum' });
    assert.strictEqual(r[0].response, '$sender, command !русский was added');

    customcommands.run({ sender: owner, message: '!русский', parameters: '' });
    await message.isSentRaw('Lorem Ipsum', owner);

    const r2 = await customcommands.remove({ sender: owner, parameters: '-c !русский' });
    assert.strictEqual(r2[0].response, '$sender, command !русский was removed');
  });
});
