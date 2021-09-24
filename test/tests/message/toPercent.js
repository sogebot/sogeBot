/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const Message = require('../../../dest/message').default;
const assert = require('assert');
const owner = { userId: String(Math.floor(Math.random() * 100000)), username: '__broadcaster__' };

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
