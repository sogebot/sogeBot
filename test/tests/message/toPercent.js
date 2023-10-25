/* global describe it before */

import('../../general.js');

import { db } from '../../general.js';
import {Message} from '../../../dest/message.js';
import assert from 'assert';
const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__' };

const tests = [
  { text: `(toPercent|2|0.5)`, expect: '50.00' },
  { text: `(toPercent|0.5)`, expect: '50' },
  { text: `(toPercent|0.4321)`, expect: '43' },
  { text: `(toPercent|2|0.43211123)`, expect: '43.21' },
];

describe('Message - (toPercent|#) filter - @func3', async () => {
  beforeEach(async () => {
    await db.cleanup();
  });

  for (const test of tests) {
    it(`${test.text} => ${test.expect}`, async () => {
      const message = await new Message(test.text).parse({ sender: owner });
      assert.strictEqual(message, test.expect);
    });
  }
});
