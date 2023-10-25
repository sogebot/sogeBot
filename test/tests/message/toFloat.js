/* global describe it before */

import('../../general.js');

import { db } from '../../general.js';
import {Message} from '../../../dest/message.js';
import assert from 'assert';
const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__' };

const tests = [
  { text: `(toFloat|2|0.5)`, expect: '0.50' },
  { text: `(toFloat|0.5)`, expect: '1' },
  { text: `(toFloat|0.4321)`, expect: '0' },
  { text: `(toFloat|2|0.43211123)`, expect: '0.43' },
];

describe('Message - (toFloat|#) filter - @func3', async () => {
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
