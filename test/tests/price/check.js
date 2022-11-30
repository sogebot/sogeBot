/* global describe it beforeEach */

require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { AppDataSource } = require('../../../dest/database.js');

const { Price } = require('../../../dest/database/entity/price');
const { User } = require('../../../dest/database/entity/user');
const alias = (require('../../../dest/systems/alias')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const price = (require('../../../dest/systems/price')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const url = require('../../general.js').url;

const tests = [
  {
    user:     user.owner.userName,
    userId:   user.owner.userId,
    points:   10,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
  {
    user:     user.viewer.userName,
    userId:   user.viewer.userId,
    points:   15,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
  {
    user:     user.viewer.userName,
    userId:   user.viewer.userId,
    points:   10,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: false,
  },
  {
    user:     user.viewer.userName,
    userId:   user.viewer.userId,
    points:   20,
    command:  '!me',
    price:    15,
    priceOn:  '!me',
    expected: true,
  },
];

describe('Price - check() - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    await AppDataSource.getRepository(User).save({ userName: user.viewer.userName, userId: user.viewer.userId });
  });

  for (const test of tests) {
    it(`${test.user} with ${test.points} points calls ${test.command}, price on ${test.priceOn} set to ${test.price} and should ${test.expected ? 'pass' : 'fail'}`, async () => {
      await AppDataSource.getRepository(User).update({ userId: user.viewer.userId }, { points: test.points });
      await AppDataSource.getRepository(Price).save({ command: test.command, price: test.price });
      const haveEnoughPoints = await price.check({ sender: { userName: test.user, userId: test.userId }, message: test.command });
      assert(haveEnoughPoints === test.expected);
    });
  }

  it(`Bits only price should return correct error response`, async () => {
    await AppDataSource.getRepository(Price).save({
      command: '!me', price: 0, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { userName: user.viewer.userName, userId: user.viewer.userId }, message: '!me' });
    assert(haveEnoughPoints === false);
    await message.isSentRaw('Sorry, @__viewer__, but you need to redeem command by 10 bits to use !me', user.viewer.userName, 20000);
  });

  it(`Points and Bits price should return correct error response`, async () => {
    await AppDataSource.getRepository(User).update({ userId: user.viewer.userId }, { points: 10 });
    await AppDataSource.getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { userName: user.viewer.userName, userId: user.viewer.userId }, message: '!me' });
    assert(haveEnoughPoints === false);
    await message.isSentRaw('Sorry, @__viewer__, but you don\'t have 100 points or redeem command by 10 bits to use !me', user.viewer.userName, 20000);
  });

  it(`Points and Bits price should be OK if user have points`, async () => {
    await AppDataSource.getRepository(User).update({ userId: user.viewer.userId }, { points: 100 });
    await AppDataSource.getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    const haveEnoughPoints = await price.check({ sender: { userName: user.viewer.userName, userId: user.viewer.userId }, message: '!me' });
    assert(haveEnoughPoints === true);
  });

  it(`Cheer should trigger alias`, async () => {
    await alias.add({ sender: user.owner, parameters: '-a !a -c !alias' });
    await AppDataSource.getRepository(Price).save({
      command: '!a', price: 100, priceBits: 10,
    });
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.cheer({
      userName: user.viewer.userName,
      userId:   user.viewer.userId,
    },
    '!a',
    100,
    );
    await message.isSentRaw('Usage => ' + url + '/systems/alias', user.viewer.userName, 20000);
  });

  it(`Cheer should trigger custom command`, async () => {
    await customcommands.add({ sender: user.owner, parameters: '-c !b -r Lorem Ipsum' });
    await AppDataSource.getRepository(Price).save({
      command: '!b', price: 100, priceBits: 10,
    });
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.cheer({
      userName: user.viewer.userName,
      userId:   user.viewer.userId,
    },
    '!b',
    100,
    );
    await message.isSentRaw('Lorem Ipsum', user.viewer.userName, 20000);
  });

  it(`Cheer should trigger core command`, async () => {
    await AppDataSource.getRepository(Price).save({
      command: '!me', price: 100, priceBits: 10,
    });
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.cheer({
      userName: user.viewer.userName,
      userId:   user.viewer.userId,
    },
    '!me',
    100);
    await message.isSentRaw('@__viewer__ | Level 0 | 0 hours | 0 points | 0 messages | €0.00 | 100 bits | 0 months', user.viewer.userName, 20000);
  });
});
