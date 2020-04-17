/* global describe it */
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
        const r = await alias.add({ sender: owner, parameters: `-a ${aliasToCreate} -c !me` });
        assert.strictEqual(r[0].response, `$sender, alias ${aliasToCreate} for !me was added`);
      });
    }

    it('(list.alias) should return created aliases', async () => {
      const r = await new Message('(list.alias)').parse({});
      assert.strictEqual(r, 'a, b, c');
    })

    it('(list.!alias) should return created aliases', async () => {
      const r = await new Message('(list.!alias)').parse({});
      assert.strictEqual(r, '!a, !b, !c');
    })
  });

  describe('(list.command) should return proper message', () => {
    for (const command of ['!a', '!b', '!c']) {
      it('Add command ' + command, async () => {
        const r = await customcommands.add({ sender: owner, parameters: `-c ${command} -r Lorem Ipsum` });
        assert.strictEqual(r[0].response, `$sender, command ${command} was added`);
      });
    }

    it('(list.command) should return created commands', async () => {
      const r = await new Message('(list.command)').parse({});
      assert.strictEqual(r, 'a, b, c');
    })

    it('(list.!command) should return created commands', async () => {
      const r = await new Message('(list.!command)').parse({});
      assert.strictEqual(r, '!a, !b, !c');
    })
  });

  describe('(list.cooldown) should return proper message', () => {
    it('!test user 20', async () => {
      const r = await cooldown.main({ sender: owner, parameters: '!test user 20' });
      assert.strictEqual(r[0].response, '$sender, user cooldown for !test was set to 20s');
    });

    it('test global 20 true', async () => {
      const r = await cooldown.main({ sender: owner, parameters: 'test global 20 true' });
      assert.strictEqual(r[0].response, '$sender, global cooldown for test was set to 20s');

    });

    it('(list.cooldown) should return created cooldowns', async () => {
      const r = await new Message('(list.cooldown)').parse({});
      assert.strictEqual(r, '!test: 20s, test: 20s');
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
      const r = await new Message('(list.ranks)').parse({});
      assert.strictEqual(r, 'test (20h), test2 (40h)');
    })
  });
});
