/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const until = require('test-until');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const _ = require('lodash');

const { getRepository } = require('typeorm');
const { Poll, PollVote } = require('../../../dest/database/entity/poll');
const { User } = require('../../../dest/database/entity/user');

const polls = (require('../../../dest/systems/polls')).default;

const assert = require('assert');

const owner = { username: 'soge__', userId: Math.floor(Math.random() * 10000) };

describe('Polls - normal', () => {
  before(async () => {
    await db.cleanup();
    await time.waitMs(1000);
    await message.prepare();
  });

  describe('Close not opened voting', () => {
    it('Close voting should fail', async () => {
      assert.isNotTrue(await polls.close({ sender: owner }));
    });
  });

  describe('Close opened voting', () => {
    it('Open new voting', async () => {
      assert(await polls.open({ sender: owner, parameters: '-title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' }));
    });
    it('Close voting', async () => {
      assert(await polls.close({ sender: owner }));
    });
  });

  describe('Voting full workflow', () => {
    let vid = null;
    it('Open new voting', async () => {
      assert(await polls.open({ sender: owner, parameters: '-title "Lorem Ipsum?" Lorem | Ipsum | Dolor Sit' }));
    });
    it('Open another voting should fail', async () => {
      assert(!(await polls.open({ sender: owner, parameters: '-title "Lorem Ipsum2?" Lorem2 | Ipsum2 | Dolor Sit2' })));
    });
    it('Voting should be correctly in db', async () => {
      const cVote = await getRepository(Poll).findOne({ isOpened: true });
      assert.deepEqual(cVote.type, 'normal');
      assert.deepEqual(cVote.options, ['Lorem', 'Ipsum', 'Dolor Sit']);
      assert.strictEqual(cVote.title, 'Lorem Ipsum?');
      vid = cVote.id;
    });
    it(`!vote should return correct vote status`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      await polls.main({ sender: owner, parameters: ''  });
      await message.isSent('systems.polls.status', owner, { title: 'Lorem Ipsum?' });
      await message.isSentRaw(polls.getCommand('!vote') + ` 1 - Lorem - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
      await message.isSentRaw(polls.getCommand('!vote') + ` 2 - Ipsum - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
      await message.isSentRaw(polls.getCommand('!vote') + ` 3 - Dolor Sit - 0 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`, owner);
    });
    it(`User ${owner.username} will vote for option 0 - should fail`, async () => {
      await polls.main({ sender: owner, parameters: '0' });
      const vote = await getRepository(PollVote).findOne({ votedBy: owner.username });
      assert(typeof vote === 'undefined');
    });
    it(`User ${owner.username} will vote for option 4 - should fail`, async () => {
      await polls.main({ sender: owner, parameters: '4' });
      const vote = await getRepository(PollVote).findOne({ votedBy: owner.username });
      assert(typeof vote === 'undefined');
    });
    for (const o of [1,2,3]) {
      it(`User ${owner.username} will vote for option ${o} - should be saved in db`, async () => {
        await polls.main({ sender: owner, parameters: String(o) });
        const vote = await getRepository(PollVote).findOne({ votedBy: owner.username });
        assert.strictEqual(vote.option, o - 1);
      });
    }
    it(`10 users will vote for option 1 and another 10 for option 2`, async () => {
      for (const o of [1,2]) {
        for (let i = 0; i < 10; i++) {
          await getRepository(User).save({ userId: Math.floor(Math.random() * 100000), username: 'user' + [o, i].join('') })
          const user = 'user' + [o, i].join('');
          await polls.main({ sender: { username: user }, parameters: String(o) });

          await until(async (setError) => {
            try {
              const vote = await getRepository(PollVote).findOne({ votedBy: user });
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
      await message.isSentRaw(polls.getCommand('!vote') + ` 1 - Lorem - 10 ${commons.getLocalizedName(10, 'systems.polls.votes')}, 47.62%`, owner);
      await message.isSentRaw(polls.getCommand('!vote') + ` 2 - Ipsum - 10 ${commons.getLocalizedName(10, 'systems.polls.votes')}, 47.62%`, owner);
      await message.isSentRaw(polls.getCommand('!vote') + ` 3 - Dolor Sit - 1 ${commons.getLocalizedName(1, 'systems.polls.votes')}, 4.76%`, owner);
    });

    it('Close voting', async () => {
      await time.waitMs(1000);
      await message.prepare();

      assert(await polls.close({ sender: owner }));
      await message.isSent('systems.polls.status_closed', owner, { title: 'Lorem Ipsum?' });
      await message.isSentRaw(polls.getCommand('!vote') + ` 1 - Lorem - 10 ${commons.getLocalizedName(10, 'systems.polls.votes')}, 47.62%`, owner);
      await message.isSentRaw(polls.getCommand('!vote') + ` 2 - Ipsum - 10 ${commons.getLocalizedName(10, 'systems.polls.votes')}, 47.62%`, owner);
      await message.isSentRaw(polls.getCommand('!vote') + ` 3 - Dolor Sit - 1 ${commons.getLocalizedName(1, 'systems.polls.votes')}, 4.76%`, owner);
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
