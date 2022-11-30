/* eslint-disable @typescript-eslint/no-var-requires */
/* global */
require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { AppDataSource } = require('../../../dest/database.js');

const { Bets } = require('../../../dest/database/entity/bets');
const { User } = require('../../../dest/database/entity/user');
const changelog = (require('../../../dest/helpers/user/changelog'));
const bets = (require('../../../dest/systems/bets')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

// users
const owner = { userName: '__broadcaster__' };

const tests = {
  false: [
    {
      timeout: 5,
      title:   'Jak se umistim?',
      options: [
        'Vyhra',
      ],
      bets: [],
    },
  ],
  true: [
    {
      timeout: 5,
      title:   'Jak se umistim?',
      options: [
        'Vyhra',
        'Top 3',
        'Top 10',
      ],
      bets: [
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 10, betOn: 0,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 20, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 30, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 40, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 50, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 60, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 70, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 80, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 90, betOn: 2,
        },
      ],
      win:        0,
      winTickets: 16,
      response:   {
        open:  `New bet 'Jak se umistim?' is opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet 1-3 <amount> to win! You have only 5min to bet!`,
        close: `Bets was closed and winning option was Vyhra! 1 users won in total 16 points!`,
      },
    },
    {
      timeout: 5,
      title:   'Vyhra / Prohra',
      options: [
        'Vyhra',
        'Prohra',
      ],
      bets: [
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 10, betOn: 0,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 20, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 30, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 40, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 50, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 60, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 70, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 80, betOn: 1,
        },
        {
          userName: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5), userId: String(Math.floor(Math.random() * 100000)), tickets: 90, betOn: 0,
        },
      ],
      win:        1,
      winTickets: 490,
      response:   {
        open:  `New bet 'Vyhra / Prohra' is opened! Bet options: 1. 'Vyhra', 2. 'Prohra'. Use !bet 1-2 <amount> to win! You have only 5min to bet!`,
        close: `Bets was closed and winning option was Prohra! 7 users won in total 490 points!`,
      },
    },
  ],
};

describe('Bets - @func3 - workflow()', () => {
  for (let [s, ta] of Object.entries(tests)) {
    s = s === 'true';

    for (const t of ta) {
      const input = [
        '-timeout ' + String(t.timeout),
        `-title "${t.title}"`,
        t.options.join(' | '),
      ];

      describe((s ? 'OK' : 'NG') + ' - ' + input.join(' '), () => {
        let r;
        before(async () => {
          await db.cleanup();
          await message.prepare();
        });

        it('Open new bet', async () => {
          r = await bets.open({ sender: owner, parameters: input.join(' ') });
        });

        if (!s) {
          it ('Bet open should failed', async() => {
            const currentBet = (await Bets.find({
              order:     { createdAt: 'DESC' },
            }))[0];
            assert(typeof currentBet === 'undefined');
          });
        } else {
          it ('!bet open should have correct message', async () => {
            assert.strictEqual(r[0].response, t.response.open);
          });
          it ('!bet open should be correctly saved in db', async() => {
            const currentBet = (await Bets.find({
              order:     { createdAt: 'DESC' },
            }))[0];

            assert(typeof currentBet !== 'undefined');
            assert.strictEqual(currentBet.title, t.title);
            assert(_.isEqual(currentBet.options, t.options),
              `\nExpected: ${JSON.stringify(t.options)}\nActual:   ${JSON.stringify(currentBet.options)}\n\t`);
          });

          for (const bet of t.bets) {
            it(`user ${bet.userName} will bet on ${bet.betOn + 1} ${bet.tickets} tickets`, async () => {
              await AppDataSource.getRepository(User).save({
                userName: bet.userName , userId: bet.userId, points: 100,
              });
              await bets.participate({
                parameters: `${bet.betOn + 1} ${bet.tickets}`,
                sender:     { userName: bet.userName, userId: bet.userId },
                command:    '!bet',
              });
            });
          }

          it('Bet close should have correct win message', async () => {
            r = await bets.close({ parameters: `${t.win}`, sender: owner });
            assert.strictEqual(r[0].response, t.response.close);
          });

          for (const bet of t.bets) {
            if (t.win !== bet.betOn) {
              it(`LOST: user ${bet.userName} should have ${100 - bet.tickets} tickets`, async () => {
                await changelog.flush();
                const user = await AppDataSource.getRepository(User).findOneBy({ userName: bet.userName , userId: bet.userId });
                assert.strictEqual(user.points, 100 - bet.tickets);
              });
            } else {
              const percentGain = (t.options.length * 20) / 100;
              const expected = 100 + Math.round(bet.tickets * percentGain);
              it(`WIN: user ${bet.userName} should have ${expected} tickets`, async () => {
                await changelog.flush();
                const user = await AppDataSource.getRepository(User).findOneBy({ userName: bet.userName , userId: bet.userId });
                assert.strictEqual(user.points, expected);
              });
            }
          }
        }
      });
    }
  }
});

describe('Open bet twice should fail', () => {
  let r;
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Open first bet', async () => {
    const input = [
      '-timeout ' + String(tests.true[0].timeout),
      `-title "${tests.true[0].title}"`,
      tests.true[0].options.join(' | '),
    ];
    r = await bets.open({ sender: owner, parameters: input.join(' ') });
  });

  it ('!bet open should have correct message', async () => {
    assert.strictEqual(r[0].response, `New bet 'Jak se umistim?' is opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet 1-3 <amount> to win! You have only 5min to bet!`);
  });
  it ('!bet open should be correctly saved in db', async() => {
    const currentBet = (await Bets.find({
      order:     { createdAt: 'DESC' },
    }))[0];

    assert(typeof currentBet !== 'undefined');
    assert.strictEqual(currentBet.title, tests.true[0].title);
    assert(_.isEqual(currentBet.options, tests.true[0].options),
      `\nExpected: ${JSON.stringify(tests.true[0].options)}\nActual:   ${JSON.stringify(currentBet.options)}\n\t`);
  });

  it('Open second bet', async () => {
    const input = [
      '-timeout ' + String(tests.true[1].timeout),
      `-title "${tests.true[1].title}"`,
      tests.true[1].options.join(' | '),
    ];
    r = await bets.open({ sender: owner, parameters: input.join(' ') });
  });

  it('Expect bets.running error', async () => {
    assert.strictEqual(r[0].response, `$sender, bet is already opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet close 1-3`);
  });
});

describe('Bet close should fail if bet is not opened', () => {
  let r;
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('close bet', async () => {
    r = await bets.close({ parameters: `0`, sender: owner });
  });

  it('Expect bets.notRunning error', async () => {
    assert.strictEqual(r[0].response, 'No bet is currently opened, ask mods to open it!');
  });
});

describe('Bet close should fail if wrong option is given', () => {
  let r;
  const command = '!bet';

  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Open bet', async () => {
    const input = [
      '-timeout ' + String(tests.true[0].timeout),
      `-title "${tests.true[0].title}"`,
      tests.true[0].options.join(' | '),
    ];
    r = await bets.open({ sender: owner, parameters: input.join(' ') });
  });

  it ('!bet open should have correct message', async () => {
    assert.strictEqual(r[0].response, `New bet 'Jak se umistim?' is opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet 1-3 <amount> to win! You have only 5min to bet!`);
  });
  it ('!bet open should be correctly saved in db', async() => {
    const currentBet = (await Bets.find({
      order:     { createdAt: 'DESC' },
    }))[0];

    assert(typeof currentBet !== 'undefined');
    assert.strictEqual(currentBet.title, tests.true[0].title);
    assert(_.isEqual(currentBet.options, tests.true[0].options),
      `\nExpected: ${JSON.stringify(tests.true[0].options)}\nActual:   ${JSON.stringify(currentBet.options)}\n\t`);
  });

  it('close bet with incorrect option', async () => {
    r = await bets.close({
      parameters: `10`, sender: owner, command,
    });
  });

  it('Expect bets.notRunning error', async () => {
    assert.strictEqual(r[0].response, `$sender, this option doesn't exist! Bet is not closed, check !bet`);
  });
});

describe('Incorrect participate should show info', () => {
  let r;
  const command = '!bet';

  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Open bet', async () => {
    const input = [
      '-timeout ' + String(tests.true[0].timeout),
      `-title "${tests.true[0].title}"`,
      tests.true[0].options.join(' | '),
    ];
    r = await bets.open({ sender: owner, parameters: input.join(' ') });
  });

  it ('!bet open should have correct message', async () => {
    assert.strictEqual(r[0].response, `New bet 'Jak se umistim?' is opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet 1-3 <amount> to win! You have only 5min to bet!`);
  });
  it ('!bet open should be correctly saved in db', async() => {
    const currentBet = (await Bets.find({
      order:     { createdAt: 'DESC' },
    }))[0];

    assert(typeof currentBet !== 'undefined');
    assert.strictEqual(currentBet.title, tests.true[0].title);
    assert(_.isEqual(currentBet.options, tests.true[0].options),
      `\nExpected: ${JSON.stringify(tests.true[0].options)}\nActual:   ${JSON.stringify(currentBet.options)}\n\t`);
  });

  it('Incorrect participate should show info', async () => {
    r = await bets.participate({
      parameters: '', sender: owner, command,
    });
  });

  it('Expect bets.info', async () => {
    assert.strictEqual(r[0].response, `Bet 'Jak se umistim?' is still opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet 1-3 <amount> to win! You have only 5.0min to bet!`, owner);
  });
});

describe('Bet info should show all correct states', () => {
  let r;
  const command = '!bet';

  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Run bet info without bet', async () => {
    r = await bets.participate({
      parameters: '', sender: owner, command,
    });
  });

  it('Expect bets.notRunning', async () => {
    assert.strictEqual(r[0].response, `No bet is currently opened, ask mods to open it!`);
  });

  it('Open bet', async () => {
    const input = [
      '-timeout ' + String(tests.true[0].timeout),
      `-title "${tests.true[0].title}"`,
      tests.true[0].options.join(' | '),
    ];
    r = await bets.open({ sender: owner, parameters: input.join(' ') });
  });

  it ('!bet open should have correct message', async () => {
    assert.strictEqual(r[0].response, `New bet 'Jak se umistim?' is opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet 1-3 <amount> to win! You have only 5min to bet!`);
  });
  it ('!bet open should be correctly saved in db', async() => {
    const currentBet = (await Bets.find({
      order:     { createdAt: 'DESC' },
    }))[0];

    assert(typeof currentBet !== 'undefined');
    assert.strictEqual(currentBet.title, tests.true[0].title);
    assert(_.isEqual(currentBet.options, tests.true[0].options),
      `\nExpected: ${JSON.stringify(tests.true[0].options)}\nActual:   ${JSON.stringify(currentBet.options)}\n\t`);
  });

  it('Bet info when opened bet', async () => {
    r = await bets.participate({
      parameters: '', sender: owner, command,
    });
  });

  it('Expect bets.info', async () => {
    assert.strictEqual(r[0].response, `Bet 'Jak se umistim?' is still opened! Bet options: 1. 'Vyhra', 2. 'Top 3', 3. 'Top 10'. Use !bet 1-3 <amount> to win! You have only 5.0min to bet!`);
  });

  it('Lock bet', async () => {
    await Bets.update({}, { isLocked: true });
  });

  it('Bet info when locked bet', async () => {
    r = await bets.info({
      parameters: '', sender: owner, command,
    });
  });

  it('Expect bets.lockedInfo', async () => {
    assert.strictEqual(r[0].response, `Bet 'Jak se umistim?' is still opened, but time for betting is up!`);
  });
});