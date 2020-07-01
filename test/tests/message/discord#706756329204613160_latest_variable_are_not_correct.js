/* eslint-disable @typescript-eslint/no-var-requires */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const Message = require('../../../dest/message').default;

const assert = require('assert');

const { getRepository } = require('typeorm');
const { EventList } = require('../../../dest/database/entity/eventList');

// users
const owner = { username: 'soge__' };

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/706756329204613160 - latest global variables are not correct', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 follow events', async () => {
    for (let i = 0; i < 10; i++) {
      await getRepository(EventList).save({
        isTest: false,
        event: 'follow',
        timestamp: 1000 * i,
        username: `user${i}`,
        values_json: '{}',
      });
    }
  });

  it ('Add 10 sub/resub/subgift events', async () => {
    for (let i = 10; i < 20; i++) {
      await getRepository(EventList).save({
        isTest: false,
        event: ['sub', 'resub', 'subgift'][Math.floor(Math.random() * 3)],
        timestamp: 2000 * i,
        username: `user${i}`,
        values_json: '{}',
      });
    }
  });

  it ('Add 10 tips events', async () => {
    for (let i = 20; i < 30; i++) {
      await getRepository(EventList).save({
        isTest: false,
        event: 'tip',
        timestamp: 3000 * i,
        username: `user${i}`,
        values_json: JSON.stringify({
          amount: i,
          currency: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'][i-20],
          message: `message${i-20}`,
        }),
      });
    }
  });

  it ('Add 10 cheer events', async () => {
    for (let i = 30; i < 40; i++) {
      await getRepository(EventList).save({
        isTest: false,
        event: 'cheer',
        timestamp: 4000 * i,
        username: `user${i}`,
        values_json: JSON.stringify({
          amount: i,
          message: `message${i-30}`,
        }),
      });
    }
  });

  it ('$latestFollower should have correct user9', async () => {
    const parsed = await new Message('$latestFollower').parse({ sender: owner});
    assert.strictEqual(parsed, 'user9');
  });

  it ('$latestSubscriber should have correct user19', async () => {
    const parsed = await new Message('$latestSubscriber').parse({ sender: owner});
    assert.strictEqual(parsed, 'user19');
  });

  it ('$latestTip should have correct user29', async () => {
    const parsed = await new Message('$latestTip').parse({ sender: owner});
    assert.strictEqual(parsed, 'user29');
  });

  it ('$latestTipAmount should have correct 29', async () => {
    const parsed = await new Message('$latestTipAmount').parse({ sender: owner});
    assert.strictEqual(parsed, '29.00');
  });

  it ('$latestTipCurrency should have correct j', async () => {
    const parsed = await new Message('$latestTipCurrency').parse({ sender: owner});
    assert.strictEqual(parsed, 'j');
  });

  it ('$latestTipMessage should have correct message9', async () => {
    const parsed = await new Message('$latestTipMessage').parse({ sender: owner});
    assert.strictEqual(parsed, 'message9');
  });

  it ('$latestCheer should have correct user39', async () => {
    const parsed = await new Message('$latestCheer').parse({ sender: owner});
    assert.strictEqual(parsed, 'user39');
  });

  it ('$latestCheerAmount should have correct 39', async () => {
    const parsed = await new Message('$latestCheerAmount').parse({ sender: owner});
    assert.strictEqual(parsed, '39');
  });

  it ('$latestCheerMessage should have correct message9', async () => {
    const parsed = await new Message('$latestCheerMessage').parse({ sender: owner});
    assert.strictEqual(parsed, 'message9');
  });
});
