/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const until = require('test-until');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Poll, PollVote } = require('../../../dest/database/entity/poll');

const currency = (require('../../../dest/currency')).default;
const polls = (require('../../../dest/systems/polls')).default;
const streamlabs = (require('../../../dest/integrations/streamlabs')).default;

const assert = require('assert');

const owner = { username: 'soge__', userId: Math.floor(Math.random() * 10000) };

describe('Polls - tips', () => {
  before(async () => {
    await db.cleanup();
    await time.waitMs(1000);
    await message.prepare();

    currency.mainCurrency = 'EUR';
  });

  describe('Close not opened voting', () => {
    it('Close voting should fail', async () => {
      const r = await polls.close({ sender: owner });
      assert.strictEqual(r[0].response, '$sender, there is currently no poll in progress!');
    });
  });

  describe('Close opened voting', () => {
    it('Open new voting', async () => {
      const r = await polls.open({ sender: owner, parameters: '-tips -title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' });
      assert.strictEqual(r[0].response, 'Poll by tips opened for "Lorem Ipsum test?"! You can vote by adding hashtag #voteX into tip message');
    });
    it('Close voting', async () => {
      const r = await polls.close({ sender: owner });
      assert.strictEqual(r[0].response, 'Poll "Lorem Ipsum test?" closed, status of voting:');
      assert.strictEqual(r[1].response, '#vote1 - Lorem - 0.00 votes, 0.00%');
      assert.strictEqual(r[2].response, '#vote2 - Ipsum - 0.00 votes, 0.00%');
      assert.strictEqual(r[3].response, '#vote3 - Dolor Sit - 0.00 votes, 0.00%');
    });
  });

  describe('Voting full workflow', () => {
    let vid = null;
    it('Open new voting', async () => {
      const r = await polls.open({ sender: owner, parameters: '-tips -title "Lorem Ipsum?" Lorem | Ipsum | Dolor Sit' });
      assert.strictEqual(r[0].response, 'Poll by tips opened for "Lorem Ipsum?"! You can vote by adding hashtag #voteX into tip message');
    });
    it('Open another voting should fail', async () => {
      const r = await polls.open({ sender: owner, parameters: '-tips -title "Lorem Ipsum2?" Lorem2 | Ipsum2 | Dolor Sit2' });
      assert.strictEqual(r[0].response, 'Error! Poll by tips was already opened for "Lorem Ipsum?"! You can vote by adding hashtag #voteX into tip message');
    });
    it('Voting should be correctly in db', async () => {
      const cVote = await getRepository(Poll).findOne({ isOpened: true });
      assert.deepEqual(cVote.options, ['Lorem', 'Ipsum', 'Dolor Sit']);
      assert.deepEqual(cVote.type, 'tips');
      assert.strictEqual(cVote.title, 'Lorem Ipsum?');
      vid = cVote.id;
    });
    it(`!vote should return correct vote status`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      const r = await polls.main({ sender: owner, parameters: ''  });
      assert.strictEqual(r[0].response, '$sender, current status of poll "Lorem Ipsum?":');
      assert.strictEqual(r[1].response, `#vote1 - Lorem - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`);
      assert.strictEqual(r[2].response, `#vote2 - Ipsum - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`);
      assert.strictEqual(r[3].response, `#vote3 - Dolor Sit - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`);
    });
    for (const o of [0,1,2,3,4]) {
      it(`User ${owner.username} will vote for option ${o} - should fail`, async () => {
        await polls.main({ sender: owner, parameters: String(o) });
        const vote = await getRepository(PollVote).findOne({ votedBy: owner.username });
        assert(typeof vote === 'undefined', 'Expected ' + JSON.stringify({ votedBy: owner.username, vid }) + ' to not be found in db');
      });
    }
    it(`10 users will vote through tips for option 1 and another 10 for option 2`, async () => {
      for (const o of [1,2]) {
        for (let i = 0; i < 10; i++) {
          await getRepository(User).save({ userId: Math.floor(Math.random() * 100000), username: 'user' + [o, i].join('') })
          const user = 'user' + [o, i].join('');
          await streamlabs.parse({
            type: 'donation',
            message: [{
              isTest: true,
              amount: 10,
              from: user,
              message: 'Cool I am voting for #vote' + o + ' enjoy!',
              currency: 'EUR',
            }],
          });

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

      const r = await polls.main({ sender: owner, parameters: ''  });
      assert.strictEqual(r[0].response, '$sender, current status of poll "Lorem Ipsum?":');
      assert.strictEqual(r[1].response, `#vote1 - Lorem - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`);
      assert.strictEqual(r[2].response, `#vote2 - Ipsum - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`);
      assert.strictEqual(r[3].response, `#vote3 - Dolor Sit - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`);
    });

    it('Close voting', async () => {
      await time.waitMs(1000);
      await message.prepare();

      const r = await polls.close({ sender: owner });
      assert.strictEqual(r[0].response, 'Poll "Lorem Ipsum?" closed, status of voting:');
      assert.strictEqual(r[1].response, `#vote1 - Lorem - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`);
      assert.strictEqual(r[2].response, `#vote2 - Ipsum - 100.00 ${commons.getLocalizedName(100, 'systems.polls.votes')}, 50.00%`);
      assert.strictEqual(r[3].response, `#vote3 - Dolor Sit - 0.00 ${commons.getLocalizedName(0, 'systems.polls.votes')}, 0.00%`);
    });

    it(`!vote should return not in progress info`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      const r = await polls.main({ sender: owner, parameters: ''  });
      assert.strictEqual(r[0].response, '$sender, there is currently no poll in progress!');
    });

    it(`!vote 1 should return not in progress info`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      const user = Math.random();
      const r = await polls.main({ sender: { username: user }, parameters: '1' });
      assert.strictEqual(r[0].response, '$sender, there is currently no poll in progress!');
    });
  });
});
