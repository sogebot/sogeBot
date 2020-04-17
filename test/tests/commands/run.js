/* global describe it before */


require('../../general.js');
const uuid = require('uuid/v4');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const { permission } = require('../../../dest/helpers/permissions');

const { getRepository } = require('typeorm');
const { Commands } = require('../../../dest/database/entity/commands');
const { User } = require('../../../dest/database/entity/user');

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };
const user1 = { username: 'user1', userId: Math.floor(Math.random() * 100000) };

describe('Custom Commands - run()', () => {
  before(async () => {
    await db.cleanup();
    message.prepare();

    await getRepository(User).save({ username: owner.username, userId: owner.userId });
    await getRepository(User).save({ username: user1.username, userId: user1.userId });
  });

  describe('\'!test qwerty\' should trigger correct commands', () => {
    it('create \'!test\' command with $_variable', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test', enabled: true, visible: true, responses: [{
          filter: '', response: '$_variable', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }],
      });
    });
    it('create \'!test\' command with $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test', enabled: true, visible: true, responses: [{
          filter: '', response: '$param by !test command with param', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }],
      });
    });
    it('create \'!test\' command without $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test', enabled: true, visible: true, responses: [{
          filter: '!$haveParam', response: 'This should not be triggered', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }],
      });
    });
    it('create \'!test qwerty\' command without $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test qwerty', enabled: true, visible: true, responses: [{
          filter: '', response: 'This should be triggered', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }],
      });
    });
    it('create second \'!test qwerty\' command without $param', async () => {
      await getRepository(Commands).save({
        id: uuid(), command: '!test qwerty', enabled: true, visible: true, responses: [{
          filter: '', response: 'This should be triggered as well', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }],
      });
    });

    it('run command by owner', async () => {
      await customcommands.run({ sender: owner, message: '!test qwerty', parameters: 'qwerty' });
      await message.isSentRaw('qwerty by !test command with param', owner);
      await message.isSentRaw('@soge__, $_variable was set to qwerty.', owner);
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
      await getRepository(Commands).save({
        id: uuid(), command: '!cmd', enabled: true, visible: true, responses: [{
          filter: '$sender == "user1"', response: 'Lorem Ipsum', permission: permission.VIEWERS, stopIfExecuted: false, order: 0,
        }],
      });
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

    const r2 = await customcommands.remove({ sender: owner, parameters: '!a' });
    assert.strictEqual(r2[0].response, '$sender, command !a was removed');
  });

  it('!한글 will show Lorem Ipsum', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !한글 -r Lorem Ipsum' });
    assert.strictEqual(r[0].response, '$sender, command !한글 was added');

    customcommands.run({ sender: owner, message: '!한글', parameters: '' });
    await message.isSentRaw('Lorem Ipsum', owner);

    const r2 = await customcommands.remove({ sender: owner, parameters: '!한글' });
    assert.strictEqual(r2[0].response, '$sender, command !한글 was removed');
  });

  it('!русский will show Lorem Ipsum', async () => {
    const r = await customcommands.add({ sender: owner, parameters: '-c !русский -r Lorem Ipsum' });
    assert.strictEqual(r[0].response, '$sender, command !русский was added');

    customcommands.run({ sender: owner, message: '!русский', parameters: '' });
    await message.isSentRaw('Lorem Ipsum', owner);

    const r2 = await customcommands.remove({ sender: owner, parameters: '!русский' });
    assert.strictEqual(r2[0].response, '$sender, command !русский was removed');
  });
});
