/* global */

require('../../general.js');

const assert = require('assert');

const owner = { userId: String(Math.floor(Math.random() * 100000)), userName: '__broadcaster__' };
const constants = require('@sogebot/ui-helpers/constants');
const { getRepository } = require('typeorm');

const { EventList } = require('../../../dest/database/entity/eventList');
const { User, UserTip, UserBit } = require('../../../dest/database/entity/user');
const rates = require('../../../dest/helpers/currency/rates').default;
const Message = require('../../../dest/message').default;
const db = require('../../general.js').db;

const tests = [
  { text: `(count|subs|hour)`, expect: '5' },
  { text: `(count|subs|day)`, expect: '10' },
  { text: `(count|subs|week)`, expect: '15' },
  { text: `(count|subs|month)`, expect: '20' },
  { text: `(count|subs|year)`, expect: '25' },

  { text: `(count|follows|hour)`, expect: '5' },
  { text: `(count|follows|day)`, expect: '10' },
  { text: `(count|follows|week)`, expect: '15' },
  { text: `(count|follows|month)`, expect: '20' },
  { text: `(count|follows|year)`, expect: '25' },

  { text: `(count|bits|hour)`, expect: '5' },
  { text: `(count|bits|day)`, expect: '10' },
  { text: `(count|bits|week)`, expect: '15' },
  { text: `(count|bits|month)`, expect: '20' },
  { text: `(count|bits|year)`, expect: '25' },

  { text: `(count|tips|hour)`, expect: '5' },
  { text: `(count|tips|day)`, expect: '10' },
  { text: `(count|tips|week)`, expect: '15' },
  { text: `(count|tips|month)`, expect: '20' },
  { text: `(count|tips|year)`, expect: '25' },
];

const getTimestamp = (idx) => {
  if (idx < 5) {
    return Date.now() - (constants.HOUR / 2);
  } else if (idx < 10) {
    return Date.now() - (constants.DAY / 2);
  } else if (idx < 15) {
    return Date.now() - ((constants.DAY * 7) / 2);
  } else if (idx < 20) {
    return Date.now() - ((constants.DAY * 31) / 2);
  }
  return Date.now() - (constants.DAY * 180);
};

describe('Message - (count|#) filter - @func3', async () => {
  beforeEach(async () => {
    await db.cleanup();

    const currency = require('../../../dest/currency').default;
    for (let i = 0; i < 25; i++) {
      await getRepository(EventList).save({
        isTest:      false,
        event:       'sub',
        timestamp:   getTimestamp(i),
        userId:      `${i}`,
        values_json: '{}',
      });
      await getRepository(EventList).save({
        isTest:      false,
        event:       'follow',
        timestamp:   getTimestamp(i),
        userId:      `${i*10000}`,
        values_json: '{}',
      });
      await getRepository(UserTip).save({
        amount:        1,
        sortAmount:    1,
        currency:      'EUR',
        message:       'test',
        tippedAt:      getTimestamp(i),
        exchangeRates: rates,
        userId:        `${i*10000}`,
      });
      await getRepository(UserBit).save({
        amount:    1,
        message:   'test',
        cheeredAt: getTimestamp(i),
        userId:    `${i*10000}`,
      });
    }
  });

  for (const test of tests) {
    it(`${test.text} => ${test.expect}`, async () => {
      const message = await new Message(test.text).parse({ sender: owner });
      assert.strictEqual(message, test.expect);
    });
  }
});
