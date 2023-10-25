
import assert from 'assert';

import('../../general.js');

import { setImmediateAwait } from '../../../dest//helpers/setImmediateAwait.js';
import { AppDataSource } from '../../../dest/database.js';
import { EventList } from '../../../dest/database/entity/eventList.js';
import { User } from '../../../dest/database/entity/user.js';
import {Message} from '../../../dest/message.js';
import eventlist from '../../../dest/overlays/eventlist.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Message - https://discordapp.com/channels/317348946144002050/619437014001123338/706756329204613160 - latest global variables are not correct - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    for (let i = 10000000; i < 10000040; i++) {
      await AppDataSource.getRepository(User).save({ userName: `user${i}`, userId: String(i) });
    }

  });

  it ('Add 10 follow events', async () => {
    for (let i = 10000000; i < 10000010; i++) {
      await AppDataSource.getRepository(EventList).save({
        isTest:      false,
        event:       'follow',
        timestamp:   i,
        userId:      `${i}`,
        values_json: '{}',
      });
      await setImmediateAwait();
    }
  });

  it ('Add 10 sub/resub/subgift events', async () => {
    for (let i = 10000010; i < 10000020; i++) {
      await AppDataSource.getRepository(EventList).save({
        isTest:      false,
        event:       ['sub', 'resub', 'subgift'][Math.floor(Math.random() * 3)],
        timestamp:   i,
        userId:      `${i}`,
        values_json: '{}',
      });
      await setImmediateAwait();
    }
  });

  it ('Add 10 tips events', async () => {
    for (let i = 10000020; i < 10000030; i++) {
      await AppDataSource.getRepository(EventList).save({
        isTest:      false,
        event:       'tip',
        timestamp:   i,
        userId:      `${i}`,
        values_json: JSON.stringify({
          amount:   i,
          currency: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'][i-10000020],
          message:  `message${i-20}`,
        }),
      });
      await setImmediateAwait();
    }
  });

  it ('Add 10 cheer events', async () => {
    for (let i = 10000030; i < 10000040; i++) {
      await AppDataSource.getRepository(EventList).save({
        isTest:      false,
        event:       'cheer',
        timestamp:   i,
        userId:      `${i}`,
        values_json: JSON.stringify({
          bits:    i,
          message: `message${i-30}`,
        }),
      });
      await setImmediateAwait();
    }
  });

  it ('$latestFollower should have correct user10000009', async () => {
    const parsed = await new Message('$latestFollower').parse({ sender: owner });
    assert.strictEqual(parsed, 'user10000009');
  });

  it ('$latestSubscriber should have correct user10000019', async () => {
    const parsed = await new Message('$latestSubscriber').parse({ sender: owner });
    assert.strictEqual(parsed, 'user10000019');
  });

  it ('$latestTip should have correct user10000029', async () => {
    const parsed = await new Message('$latestTip').parse({ sender: owner });
    assert.strictEqual(parsed, 'user10000029');
  });

  it ('$latestTipAmount should have correct 10000029', async () => {
    const parsed = await new Message('$latestTipAmount').parse({ sender: owner });
    assert.strictEqual(parsed, '10000029.00');
  });

  it ('$latestTipCurrency should have correct j', async () => {
    const parsed = await new Message('$latestTipCurrency').parse({ sender: owner });
    assert.strictEqual(parsed, 'j');
  });

  it ('$latestTipMessage should have correct message10000009', async () => {
    const parsed = await new Message('$latestTipMessage').parse({ sender: owner });
    assert.strictEqual(parsed, 'message10000009');
  });

  it ('$latestCheer should have correct user10000039', async () => {
    const parsed = await new Message('$latestCheer').parse({ sender: owner });
    assert.strictEqual(parsed, 'user10000039');
  });

  it ('$latestCheerAmount should have correct 10000039', async () => {
    const parsed = await new Message('$latestCheerAmount').parse({ sender: owner });
    assert.strictEqual(parsed, '10000039');
  });

  it ('$latestCheerMessage should have correct message10000009', async () => {
    const parsed = await new Message('$latestCheerMessage').parse({ sender: owner });
    assert.strictEqual(parsed, 'message10000009');
  });
});
