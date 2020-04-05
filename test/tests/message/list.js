/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const assert = require('assert');

const Message = require('../../../dest/message').default;
const alias = (require('../../../dest/systems/alias')).default;
const cooldown = (require('../../../dest/systems/cooldown')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const ranks = (require('../../../dest/systems/ranks')).default;
const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

describe('Message - list filter', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await getRepository(User).save({ username: owner.username, userId: owner.userId });
  });

  describe('(list.alias) should return proper message', () => {
    for (const aliasToCreate of ['!a', '!b', '!c']) {
      it('Add alias ' + aliasToCreate, async () => {
        alias.add({ sender: owner, parameters: `-a ${aliasToCreate} -c !me` });
        await message.isSent('alias.alias-was-added', owner, {
          alias: aliasToCreate, command: '!me', sender: owner.username ,
        });
      });
    }

    it('(list.alias) should return created aliases', async () => {
      const message = await new Message('(list.alias)').parse({});
      assert.strictEqual(message, 'a, b, c');
    })

    it('(list.!alias) should return created aliases', async () => {
      const message = await new Message('(list.!alias)').parse({});
      assert.strictEqual(message, '!a, !b, !c');
    })
  });

  describe('(list.command) should return proper message', () => {
    for (const command of ['!a', '!b', '!c']) {
      it('Add command ' + command, async () => {
        customcommands.add({ sender: owner, parameters: `-c ${command} -r Lorem Ipsum` });
        await message.isSent('customcmds.command-was-added', owner, {
          command, response: 'Lorem Ipsum', sender: owner.username ,
        });
      });
    }

    it('(list.command) should return created commands', async () => {
      const message = await new Message('(list.command)').parse({});
      assert.strictEqual(message, 'a, b, c');
    })

    it('(list.!command) should return created commands', async () => {
      const message = await new Message('(list.!command)').parse({});
      assert.strictEqual(message, '!a, !b, !c');
    })
  });

  describe('(list.cooldown) should return proper message', () => {
    it('!test user 20', async () => {
      cooldown.main({ sender: owner, parameters: '!test user 20' });
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: '!test', type: 'user', seconds: 20, sender: owner.username });
    });

    it('test global 20 true', async () => {
      cooldown.main({ sender: owner, parameters: 'test global 20 true' });
      await message.isSent('cooldowns.cooldown-was-set', owner, { command: 'test', type: 'global', seconds: 20, sender: owner.username });
    });

    it('(list.cooldown) should return created cooldowns', async () => {
      const message = await new Message('(list.cooldown)').parse({});
      assert.strictEqual(message, '!test: 20s, test: 20s');
    })
  });

    describe('(list.ranks) should return proper message', () => {
    it('test - 20h', async () => {
      ranks.add({ sender: owner, parameters: '20 test' });
      await message.isSent('ranks.rank-was-added', owner,
        {
          rank: 'test',
          hours: 20,
          sender: owner.username,
          type: 'viewer',
          hlocale: 'hours',
        });
    });

    it('test2 - 40h', async () => {
      ranks.add({ sender: owner, parameters: '40 test2' });
      await message.isSent('ranks.rank-was-added', owner,
        {
          rank: 'test2',
          hours: 40,
          sender: owner.username,
          type: 'viewer',
          hlocale: 'hours',
        });
    });

    it('(list.ranks) should return created ranks', async () => {
      const message = await new Message('(list.ranks)').parse({});
      assert.strictEqual(message, 'test (20h), test2 (40h)');
    })
  });
});
