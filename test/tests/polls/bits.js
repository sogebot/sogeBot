/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const until = require('test-until');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

const polls = (require('../../../dest/systems/polls')).default;
const tmi = (require('../../../dest/tmi')).default;

const { getRepository } = require('typeorm');
const { Poll, PollVote } = require('../../../dest/database/entity/poll');

const assert = require('assert');

const owner = { username: 'soge__', userId: Math.floor(Math.random() * 10000) };

describe('Polls - bits', () => {
  before(async () => {
    await db.cleanup();
    await time.waitMs(1000);
    await message.prepare();
  });

  describe('Close not opened voting', () => {
    it('Close voting should fail', async () => {
      assert(!(await polls.close({ sender: owner })));
    });
  });

  describe('Close opened voting', () => {
    it('Open new voting', async () => {
      assert(await polls.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' }));
    });
    it('Close voting', async () => {
      assert(await polls.close({ sender: owner }));
    });
  });

  describe('Voting full workflow', () => {
    let vid = null;
    it('Open new voting', async () => {
      assert(await polls.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum?" Lorem | Ipsum | Dolor Sit' }));
    });
    it('Open another voting should fail', async () => {
      assert(!(await polls.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum2?" Lorem2 | Ipsum2 | Dolor Sit2' })));
    });
    it('Voting should be correctly in db', async () => {
      const cVote = await getRepository(Poll).findOne({ isOpened: true });
      assert.deepEqual(cVote.options, ['Lorem', 'Ipsum', 'Dolor Sit']);
      assert.deepEqual(cVote.type, 'bits');
      assert.strictEqual(cVote.title, 'Lorem Ipsum?');
      vid = cVote.id;
    });
    it(`!vote should return correct vote status`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      await polls.main({ sender: owner, parameters: ''  });
      await message.isSent('systems.polls.status', owner, { title: 'Lorem Ipsum?' });
      await message.isSentRaw(`#vote1 - Lorem - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
      await message.isSentRaw(`#vote2 - Ipsum - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
      await message.isSentRaw(`#vote3 - Dolor Sit - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
    });
    for (const o of [0,1,2,3,4]) {
      it(`User ${owner.username} will vote for option ${o} - should fail`, async () => {
        await polls.main({ sender: owner, parameters: String(o) });
        const vote = await getRepository(PollVote).findOne({ votedBy: owner.username });
        assert(typeof vote === 'undefined', 'Expected ' + JSON.stringify({ votedBy: owner.username, vid }) + ' to not be found in db');
      });
    }
    it(`10 users will vote through bits for option 1 and another 10 for option 2`, async () => {
      for (const o of [1,2]) {
        for (let i = 0; i < 10; i++) {
          const user = 'user' + [o, i].join('');
          await tmi.cheer({
            tags: {
              username: user,
              userId: Math.floor(Math.random() * 100000),
              bits: 10,
            },
            message: 'Cool I am voting for #vote' + o + ' enjoy!',
          });

          await until(async (setError) => {
            try {
              const vote = await getRepository(PollVote).findOne({ votedBy: user });
              assert(typeof vote !== 'undefined', 'Expected ' + JSON.stringify({ votedBy: user, vid }) + ' to be found in db');
              assert.strictEqual(vote.option, o - 1);
              return true;
            } catch (err) {
              return setError(
                '\nExpected ' + JSON.stringify({ votedBy: user, vid }) + ' to be found in db');
            }
          }, 5000);
        }
      }
    });
    it(`!vote should return correct vote status`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      await polls.main({ sender: owner, parameters: ''  });
      await message.isSent('systems.polls.status', owner, { title: 'Lorem Ipsum?' });
      await message.isSentRaw(`#vote1 - Lorem - 100 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner);
      await message.isSentRaw(`#vote2 - Ipsum - 100 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner);
      await message.isSentRaw(`#vote3 - Dolor Sit - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
    });

    it('Close voting', async () => {
      await time.waitMs(1000);
      await message.prepare();

      assert(await polls.close({ sender: owner }));
      await message.isSent('systems.polls.status_closed', owner, { title: 'Lorem Ipsum?' });
      await message.isSentRaw(`#vote1 - Lorem - 100 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner);
      await message.isSentRaw(`#vote2 - Ipsum - 100 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`, owner);
      await message.isSentRaw(`#vote3 - Dolor Sit - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
    });

    it(`!vote should return not in progress info`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      await polls.main({ sender: owner, parameters: ''  });
      await message.isSent('systems.polls.notInProgress', owner);
    });

    it(`!vote 1 should return not in progress info`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      const user = Math.random();
      await polls.main({ sender: { username: user }, parameters: '1' });
      await message.isSent('systems.polls.notInProgress', { username: user });
    });
  });
});
