/* global describe it beforeEach */
require('../../general.js');

const db = require('../../general.js').db;
const assert = require('chai').assert;
const message = require('../../general.js').message;
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { Bets } = require('../../../dest/database/entity/bets');

const bets = (require('../../../dest/systems/bets')).default;

// users
const owner = { username: 'soge__' };

const tests = {
  true: [
    {
      input: '-timeout 5 -title "Jak se umistim?" Vyhra | Top 3 | Top 10',
      title: 'Jak se umistim?',
      options: [
        'Vyhra',
        'Top 3',
        'Top 10',
      ],
    },
    {
      input: '-timeout 5 -title "Vyhra / Prohra" Vyhra | Prohra',
      title: 'Vyhra / Prohra',
      options: [
        'Vyhra',
        'Prohra',
      ],
    },
  ],
};

describe('Bets - open()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  for (const [s, ta] of Object.entries(tests)) {
    for (const t of ta) {
      it((s ? 'OK' : 'NG') + ' - ' + t.input, async () => {
        await bets.open({ sender: owner, parameters: t.input });

        const currentBet = await getRepository(Bets).findOne({
          relations: ['participations'],
          order: { createdAt: 'DESC' },
        });

        if (s) {
          assert.isFalse(typeof currentBet === 'undefined');
          assert.equal(currentBet.title, t.title);
          assert.isTrue(_.isEqual(currentBet.options, t.options),
          `\nExpected: ${JSON.stringify(t.options)}\nActual:   ${JSON.stringify(currentBet.options)}\n\t`);
        } else {
          assert.isUndefined(currentBet);
        }
      });
    }
  }
});
