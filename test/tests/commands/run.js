/* global describe it before */


require('../../general.js');
const uuid = require('uuid/v4');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const { permission } = require('../../../dest/permissions');

const { getRepository } = require('typeorm');
const { Commands } = require('../../../dest/entity/commands');

// users
const owner = { username: 'soge__', userId: Math.random() };
const user1 = { username: 'user1', userId: Math.random() };

describe('Custom Commands - run()', () => {
  before(async () => {
    await db.cleanup();
    message.prepare();

    await global.db.engine.insert('users', { username: owner.username, id: owner.userId });
    await global.db.engine.insert('users', { username: user1.username, id: user1.userId });
  });

  describe('\'!test qwerty\' should trigger correct commands', () => {
    it('create \'!test\' command with $_variable', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test', enabled: true, visible: true, responses: [{
          filter: '', response: '$_variable', permission: permission.VIEWERS, stopIfExecuted: false, order: 0
        }]
      })
    });
    it('create \'!test\' command with $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test', enabled: true, visible: true, responses: [{
          filter: '', response: '$param by !test command with param', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }]
      })
    });
    it('create \'!test\' command without $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test', enabled: true, visible: true, responses: [{
          filter: '', response: 'This should not be triggered', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }]
      })
    });
    it('create \'!test qwerty\' command without $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test qwerty', enabled: true, visible: true, responses: [{
          filter: '', response: 'This should be triggered', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }]
      })
    });
    it('create second \'!test qwerty\' command without $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test qwerty', enabled: true, visible: true, responses: [{
          filter: '', response: 'This should be triggered as well', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }]
      })
    });

    it('run command by owner', async () => {
      await global.systems.customCommands.run({ sender: owner, message: '!test qwerty' });
      await message.isSentRaw('qwerty by !test command with param', owner);
      await message.isSentRaw('@soge__, $_variable was set to qwerty.', owner);
      await message.isSentRaw('This should be triggered', owner);
      await message.isSentRaw('This should be triggered as well', owner);
      await message.isNotSentRaw('This should not be triggered', owner);
    });

    it('run command by viewer', async () => {
      await global.systems.customCommands.run({ sender: user1, message: '!test qwerty' });
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
    })
    it('create command and response with filter', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!cmd', enabled: true, visible: true, responses: [{
          filter: '$sender == "user1"', response: 'Lorem Ipsum', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }]
      })
    });

    it('run command as user not defined in filter', async () => {
      global.systems.customCommands.run({ sender: owner, message: '!cmd' });
      await message.isNotSentRaw('Lorem Ipsum', owner);
    });

    it('run command as user defined in filter', async () => {
      global.systems.customCommands.run({ sender: user1, message: '!cmd' });
      await message.isSentRaw('Lorem Ipsum', user1);
    });
  });

  it('!a will show Lorem Ipsum', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-c !a -r Lorem Ipsum' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!a', response: 'Lorem Ipsum', sender: owner.username });

    global.systems.customCommands.run({ sender: owner, message: '!a' });
    await message.isSentRaw('Lorem Ipsum', owner);

    global.systems.customCommands.remove({ sender: owner, parameters: '!a' });
    await message.isSent('customcmds.command-was-removed', owner, { command: '!a', sender: owner.username });
  });

  it('!한글 will show Lorem Ipsum', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-c !한글 -r Lorem Ipsum' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!한글', response: 'Lorem Ipsum', sender: owner.username });

    global.systems.customCommands.run({ sender: owner, message: '!한글' });
    await message.isSentRaw('Lorem Ipsum', owner);

    global.systems.customCommands.remove({ sender: owner, parameters: '!한글' });
    await message.isSent('customcmds.command-was-removed', owner, { command: '!한글', sender: owner.username });
  });

  it('!русский will show Lorem Ipsum', async () => {
    global.systems.customCommands.add({ sender: owner, parameters: '-c !русский -r Lorem Ipsum' });
    await message.isSent('customcmds.command-was-added', owner, { command: '!русский', response: 'Lorem Ipsum', sender: owner.username });

    global.systems.customCommands.run({ sender: owner, message: '!русский' });
    await message.isSentRaw('Lorem Ipsum', owner);

    global.systems.customCommands.remove({ sender: owner, parameters: '!русский' });
    await message.isSent('customcmds.command-was-removed', owner, { command: '!русский', sender: owner.username });
  });
});
