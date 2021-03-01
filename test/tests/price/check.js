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

// users
const owner = { userId: String(Math.floor(Math.random() * 100000)), username: '__broadcaster__' };
const user = { userId: String(Math.floor(Math.random() * 100000)), username: 'testuser' };

const tests = [
  {
    user:     owner.username,
    userId:   owner.userId,
    points:   10,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
  {
    user:     user.username,
    userId:   user.userId,
    points:   15,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
  {
    user:     user.username,
    userId:   user.userId,
    points:   10,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: false,
  },
  {
    user:     user.username,
    userId:   user.userId,
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

    await getRepository(User).save({ username: user.username, userId: user.userId });
  });

  for (const test of tests) {
    it(`${test.user} with ${test.points} points calls ${test.command}, price on ${test.priceOn} set to ${test.price} and should ${test.expected ? 'pass' : 'fail'}`, async () => {
      await getRepository(User).update({ userId: user.userId }, { points: test.points });
      await getRepository(Price).save({ command: test.command, price: test.price });
      const haveEnoughPoints = await price.check({ sender: { username: test.user, userId: test.userId }, message: test.command });
      assert(haveEnoughPoints === test.expected);
    });
  }

  it(`Bits only price should return correct error response`, async () => {
    await getRepository(Price).save({
      command: '!me', price: 0, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { username: user.username, userId: user.userId }, message: '!me' });
    assert(haveEnoughPoints === false);
    await message.isSentRaw('Sorry, @testuser, but you need to redeem command by 10 bits to use !me', user.username, 20000);
  });

  it(`Points and Bits price should return correct error response`, async () => {
    await getRepository(User).update({ userId: user.userId }, { points: 10 });
    await getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { username: user.username, userId: user.userId }, message: '!me' });
    assert(haveEnoughPoints === false);
    await message.isSentRaw('Sorry, @testuser, but you don\'t have 100 points or redeem command by 10 bits to use !me', user.username, 20000);
  });

  it(`Points and Bits price should be OK if user have points`, async () => {
    await getRepository(User).update({ userId: user.userId }, { points: 100 });
    await getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { username: user.username, userId: user.userId }, message: '!me' });
    assert(haveEnoughPoints === true);
  });

  it(`Cheer should trigger alias`, async () => {
    await alias.add({ sender: owner, parameters: '-a !a -c !alias' });
    await getRepository(Price).save({
      command: '!a', price: 100, priceBits: 10,
    });
    tmi.cheer({
      tags: {
        username: user.username,
        userId:   user.userId,
        bits:     100,
      },
      message: '!a',
    });
    await message.isSentRaw('Usage => http://sogehige.github.io/sogeBot/#/_master/systems/alias', user.username, 20000);
  });

  it(`Cheer should trigger custom command`, async () => {
    await customcommands.add({ sender: owner, parameters: '-c !b -r Lorem Ipsum' });
    await getRepository(Price).save({
      command: '!b', price: 100, priceBits: 10,
    });
    tmi.cheer({
      tags: {
        username: user.username,
        userId:   user.userId,
        bits:     100,
      },
      message: '!b',
    });
    await message.isSentRaw('Lorem Ipsum', user.username, 20000);
  });

  it.only(`Cheer should trigger core command`, async () => {
    await getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    tmi.cheer({
      tags: {
        username: user.username,
        userId:   user.userId,
        bits:     100,
      },
      message: '!me',
    });
    await message.isSentRaw('@testuser | Level 0 | 0.0h | 0 points | 0 messages | €0.00 | 100 bits', user.username, 20000);
  });
});
