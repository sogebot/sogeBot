/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const assert = require('assert');

const Message = require('../../../dest/message').default;
const alias = (require('../../../dest/systems/alias')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const price = (require('../../../dest/systems/price')).default;
const owner = { username: 'soge__', userId: Math.floor(Math.random() * 100000) };

const { getRepository } = require('typeorm');
const { Price } = require('../../../dest/database/entity/price');

describe('Message - #3726 - price should be shown alongside alias and command list', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    await getRepository(Price).save({ command: '!a', price: 10 });
  });
  after(() => {
    price.enabled = true;
  });

  describe('(list.alias) should return proper message with prices', () => {
    it('enable price system', async () => {
      price.enabled = true;
    });

    for (const aliasToCreate of ['!a', '!b', '!c']) {
      it('Add alias ' + aliasToCreate, async () => {
        const r = await alias.add({ sender: owner, parameters: `-a ${aliasToCreate} -c !me` });
        assert.strictEqual(r[0].response, `$sender, alias ${aliasToCreate} for !me was added`);
      });
    }

    it('(list.alias) should return created aliases with price', async () => {
      const r = await new Message('(list.alias)').parse({});
      assert.strictEqual(r, 'a(10 points), b, c');
    });

    it('(list.!alias) should return created aliases with price', async () => {
      const r = await new Message('(list.!alias)').parse({});
      assert.strictEqual(r, '!a(10 points), !b, !c');
    });

    it('disable price system', async () => {
      price.enabled = false;
    });

    it('(list.alias) should return created aliases without price', async () => {
      const r = await new Message('(list.alias)').parse({});
      assert.strictEqual(r, 'a, b, c');
    });

    it('(list.!alias) should return created aliases without price', async () => {
      const r = await new Message('(list.!alias)').parse({});
      assert.strictEqual(r, '!a, !b, !c');
    });
  });

  describe('(list.command) should return proper message with prices', () => {
    it('enable price system', async () => {
      price.enabled = true;
    });

    for (const command of ['!a', '!b', '!c']) {
      it('Add command ' + command, async () => {
        const r = await customcommands.add({ sender: owner, parameters: `-c ${command} -r Lorem Ipsum` });
        assert.strictEqual(r[0].response, `$sender, command ${command} was added`);
      });
    }

    it('(list.command) should return created commands with price', async () => {
      const r = await new Message('(list.command)').parse({});
      assert.strictEqual(r, 'a(10 points), b, c');
    });

    it('(list.!command) should return created commands with price', async () => {
      const r = await new Message('(list.!command)').parse({});
      assert.strictEqual(r, '!a(10 points), !b, !c');
    });

    it('disable price system', async () => {
      price.enabled = false;
    });

    it('(list.command) should return created commands without price', async () => {
      const r = await new Message('(list.command)').parse({});
      assert.strictEqual(r, 'a, b, c');
    });

    it('(list.!command) should return created commands without price', async () => {
      const r = await new Message('(list.!command)').parse({});
      assert.strictEqual(r, '!a, !b, !c');
    });
  });
});
