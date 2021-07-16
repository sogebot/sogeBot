/* global describe it beforeEach */

require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { getRepository } = require('typeorm');

const { Price } = require('../../../dest/database/entity/price');
const { User } = require('../../../dest/database/entity/user');
const alias = (require('../../../dest/systems/alias')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const price = (require('../../../dest/systems/price')).default;
const tmi = (require('../../../dest/tmi')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const tests = [
  {
    user:     user.owner.username,
    userId:   user.owner.userId,
    points:   10,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
  {
    user:     user.viewer.username,
    userId:   user.viewer.userId,
    points:   15,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
  {
    user:     user.viewer.username,
    userId:   user.viewer.userId,
    points:   10,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: false,
  },
  {
    user:     user.viewer.username,
    userId:   user.viewer.userId,
    points:   20,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
];

describe('Price - check()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    await getRepository(User).save({ username: user.viewer.username, userId: user.viewer.userId });
  });

  for (const test of tests) {
    it(`${test.user} with ${test.points} points calls ${test.command}, price on ${test.priceOn} set to ${test.price} and should ${test.expected ? 'pass' : 'fail'}`, async () => {
      await getRepository(User).update({ userId: user.viewer.userId }, { points: test.points });
      await getRepository(Price).save({ command: test.command, price: test.price });
      const haveEnoughPoints = await price.check({ sender: { username: test.user, userId: test.userId }, message: test.command });
      assert(haveEnoughPoints === test.expected);
    });
  }

  it(`Bits only price should return correct error response`, async () => {
    await getRepository(Price).save({
      command: '!me', price: 0, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { username: user.viewer.username, userId: user.viewer.userId }, message: '!me' });
    assert(haveEnoughPoints === false);
    await message.isSentRaw('Sorry, @__viewer__, but you need to redeem command by 10 bits to use !me', user.viewer.username, 20000);
  });

  it(`Points and Bits price should return correct error response`, async () => {
    await getRepository(User).update({ userId: user.viewer.userId }, { points: 10 });
    await getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { username: user.viewer.username, userId: user.viewer.userId }, message: '!me' });
    assert(haveEnoughPoints === false);
    await message.isSentRaw('Sorry, @__viewer__, but you don\'t have 100 points or redeem command by 10 bits to use !me', user.viewer.username, 20000);
  });

  it(`Points and Bits price should be OK if user have points`, async () => {
    await getRepository(User).update({ userId: user.viewer.userId }, { points: 100 });
    await getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { username: user.viewer.username, userId: user.viewer.userId }, message: '!me' });
    assert(haveEnoughPoints === true);
  });

  it(`Cheer should trigger alias`, async () => {
    await alias.add({ sender: user.owner, parameters: '-a !a -c !alias' });
    await getRepository(Price).save({
      command: '!a', price: 100, priceBits: 10,
    });
    tmi.cheer({
      tags: {
        username: user.viewer.username,
        userId:   user.viewer.userId,
        bits:     100,
      },
      message: '!a',
    });
    await message.isSentRaw('Usage => http://sogehige.github.io/sogeBot/#/_master/systems/alias', user.viewer.username, 20000);
  });

  it(`Cheer should trigger custom command`, async () => {
    await customcommands.add({ sender: user.owner, parameters: '-c !b -r Lorem Ipsum' });
    await getRepository(Price).save({
      command: '!b', price: 100, priceBits: 10,
    });
    tmi.cheer({
      tags: {
        username: user.viewer.username,
        userId:   user.viewer.userId,
        bits:     100,
      },
      message: '!b',
    });
    await message.isSentRaw('Lorem Ipsum', user.viewer.username, 20000);
  });

  it(`Cheer should trigger core command`, async () => {
    await getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    tmi.cheer({
      tags: {
        username: user.viewer.username,
        userId:   user.viewer.userId,
        bits:     100,
      },
      message: '!me',
    });
    await message.isSentRaw('@__viewer__ | Level 0 | 0.0h | 0 points | 0 messages | €0.00 | 100 bits', user.viewer.username, 20000);
  });
});
