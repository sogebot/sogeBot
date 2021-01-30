/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const time = require('../../general.js').time;
const assert = require('assert');
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const customcommands = (require('../../../dest/systems/customcommands')).default;

// users
const owner = { username: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

describe('Custom Commands - https://discordapp.com/channels/317348946144002050/619437014001123338/715206737908465775 - Custom command can be called from custom command', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save({ username: owner.username, userId: owner.userId });
  });

  describe('Custom command should correctly run second custom command', () => {
    it('Add custom command !test to call !test2', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !test -r (!test2)' });
      const r2 = await customcommands.add({ sender: owner, parameters: '-c !test2 -r Lorem Ipsum' });

      assert.strictEqual(r[0].response, '$sender, command !test was added');
      assert.strictEqual(r2[0].response, '$sender, command !test2 was added');
    });

    it('Run custom command !test', async () => {
      await customcommands.run({ sender: owner, message: '!test' });
    });

    it('Expect !test2 response', async() => {
      await message.isSentRaw('Lorem Ipsum', owner);
    });
  });

  describe('Custom command should warn if we have infinite loop between commands', () => {
    it('Add custom command infinite loop test3 -> test4 -> test5 -> test3', async () => {
      const r = await customcommands.add({ sender: owner, parameters: '-c !test3 -r (!test4)' });
      const r2 = await customcommands.add({ sender: owner, parameters: '-c !test4 -r (!test5)' });
      const r3 = await customcommands.add({ sender: owner, parameters: '-c !test5 -r (!test3)' });

      assert.strictEqual(r[0].response, '$sender, command !test3 was added');
      assert.strictEqual(r2[0].response, '$sender, command !test4 was added');
      assert.strictEqual(r3[0].response, '$sender, command !test5 was added');
    });

    it('Run custom command !test3', async () => {
      await customcommands.run({ sender: owner, message: '!test3' });
    });

    it('Expect loop error', async() => {
      await message.debug('message.error', 'Response (!test3) seems to be in loop! !test3->!test4->!test5');
    });
  });
});
