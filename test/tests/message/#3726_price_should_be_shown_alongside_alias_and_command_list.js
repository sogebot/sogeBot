/* global describe it */
import('../../general.js');

import { db, message, user } from '../../general.js';

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import {Message} from '../../../dest/message.js';
import alias from '../../../dest/systems/alias.js';
import customcommands from '../../../dest/systems/customcommands.js';
import price from '../../../dest/systems/price.js';
const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };

import { Price } from '../../../dest/database/entity/price.js';

describe('Message - #3726 - price should be shown alongside alias and command list - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    await AppDataSource.getRepository(Price).save({ command: '!a', price: 10 });
    await AppDataSource.getRepository(Price).save({ command: '!b', price: 0, priceBits: 10 });
    await AppDataSource.getRepository(Price).save({ command: '!c', price: 10, priceBits: 10 });
  });
  after(() => {
    price.enabled = true;
  });

  describe('(list.alias) should return proper message with prices', () => {
    it('enable price system', async () => {
      price.enabled = true;
    });

    for (const aliasToCreate of ['!a', '!b', '!c', '!d']) {
      it('Add alias ' + aliasToCreate, async () => {
        const r = await alias.add({ sender: owner, parameters: `-a ${aliasToCreate} -c !me` });
        assert.strictEqual(r[0].response, `$sender, alias ${aliasToCreate} for !me was added`);
      });
    }

    it('(list.alias) should return created aliases with price', async () => {
      const r = await new Message('(list.alias)').parse({});
      assert.strictEqual(r, 'a(10 points), b(10 bits), c(10 points or 10 bits), d');
    });

    it('(list.!alias) should return created aliases with price', async () => {
      const r = await new Message('(list.!alias)').parse({});
      assert.strictEqual(r, '!a(10 points), !b(10 bits), !c(10 points or 10 bits), !d');
    });

    it('disable price system', async () => {
      price.enabled = false;
    });

    it('(list.alias) should return created aliases without price', async () => {
      const r = await new Message('(list.alias)').parse({});
      assert.strictEqual(r, 'a, b, c, d');
    });

    it('(list.!alias) should return created aliases without price', async () => {
      const r = await new Message('(list.!alias)').parse({});
      assert.strictEqual(r, '!a, !b, !c, !d');
    });
  });

  describe('(list.command) should return proper message with prices', () => {
    it('enable price system', async () => {
      price.enabled = true;
    });

    for (const command of ['!a', '!b', '!c', '!d']) {
      it('Add command ' + command, async () => {
        const r = await customcommands.add({ sender: owner, parameters: `-c ${command} -r Lorem Ipsum` });
        assert.strictEqual(r[0].response, `$sender, command ${command} was added`);
      });
    }

    it('(list.command) should return created commands with price', async () => {
      const r = await new Message('(list.command)').parse({});
      assert.strictEqual(r, 'a(10 points), b(10 bits), c(10 points or 10 bits), d');
    });

    it('(list.!command) should return created commands with price', async () => {
      const r = await new Message('(list.!command)').parse({});
      assert.strictEqual(r, '!a(10 points), !b(10 bits), !c(10 points or 10 bits), !d');
    });

    it('disable price system', async () => {
      price.enabled = false;
    });

    it('(list.command) should return created commands without price', async () => {
      const r = await new Message('(list.command)').parse({});
      assert.strictEqual(r, 'a, b, c, d');
    });

    it('(list.!command) should return created commands without price', async () => {
      const r = await new Message('(list.!command)').parse({});
      assert.strictEqual(r, '!a, !b, !c, !d');
    });
  });
});
