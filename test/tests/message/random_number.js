

/* global describe it before */

import('../../general.js');

import { db } from '../../general.js';
import {Message} from '../../../dest/message.js';
import assert from 'assert';
const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__' };

describe('Message - (random.number-#-to-#) filter - @func3', async () => {
  beforeEach(async () => {
    await db.cleanup();
  });

  it(`Several (random.number-#-to-#) should return different numbers`, async () => {
    let number = 0;
    for (let i = 0; i < 10; i++) {
      const message = await new Message('(random.number-0-to-' + i + ')').parse({ sender: owner });
      number += Number(message);
    }
    assert(number > 0);
  });

  it(`(random.number-5-to-6) should return 5 or 6`, async () => {
    for (let i = 0; i < 100; i++) {
      const message = await new Message('(random.number-5-to-6)').parse({ sender: owner });
      assert(Number(message) >= 5 && Number(message) <= 6);
    }
  });

  it(`(random.number-0-to-1) should return 0 or 1`, async () => {
    for (let i = 0; i < 100; i++) {
      const message = await new Message('(random.number-0-to-1)').parse({ sender: owner });
      assert(Number(message) >= 0 && Number(message) <= 1);
    }
  });

  it(`(random.number-0-to-0) should return 0`, async () => {
    for (let i = 0; i < 100; i++) {
      const message = await new Message('(random.number-0-to-0)').parse({ sender: owner });
      assert(Number(message) === 0);
    }
  });
});
