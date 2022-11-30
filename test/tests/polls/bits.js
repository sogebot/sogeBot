const commons = require('../../../dest/commons');

require('../../general.js');

const until = require('test-until');

const { Poll } = require('../../../dest/database/entity/poll');
const translate = require('../../../dest/translate').translate;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const polls = (require('../../../dest/systems/polls')).default;

const { getLocalizedName } = require('@sogebot/ui-helpers/getLocalized');

const assert = require('assert');

const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 10000)) };

describe('Polls - bits - @func2', () => {
  before(async () => {
    await db.cleanup();
    await time.waitMs(1000);
    await message.prepare();
  });

  describe('Close not opened voting', () => {
    it('Close voting should fail', async () => {
      const r = await polls.close({ sender: owner });
      assert.strictEqual(r[0].response, '$sender, there is currently no poll in progress!');
    });
  });

  describe('Close opened voting', () => {
    it('Open new voting', async () => {
      const r = await polls.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' });
      assert.strictEqual(r[0].response, 'Poll by cheers opened for "Lorem Ipsum test?"! You can vote by adding hashtag #voteX into bit message');
      assert.strictEqual(r[1].response, '#vote1 => Lorem');
      assert.strictEqual(r[2].response, '#vote2 => Ipsum');
      assert.strictEqual(r[3].response, '#vote3 => Dolor Sit');
    });
    it('Close voting', async () => {
      const r = await polls.close({ sender: owner });
      assert.strictEqual(r[0].response, 'Poll "Lorem Ipsum test?" closed, status of voting:');
      assert.strictEqual(r[1].response, '#vote1 - Lorem - 0 votes, 0.00%');
      assert.strictEqual(r[2].response, '#vote2 - Ipsum - 0 votes, 0.00%');
      assert.strictEqual(r[3].response, '#vote3 - Dolor Sit - 0 votes, 0.00%');
    });
  });

  describe('Voting full workflow', () => {
    let vid = null;
    it('Open new voting', async () => {
      const r = await polls.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum?" Lorem | Ipsum | Dolor Sit' });
      assert.strictEqual(r[0].response, 'Poll by cheers opened for "Lorem Ipsum?"! You can vote by adding hashtag #voteX into bit message');
      assert.strictEqual(r[1].response, '#vote1 => Lorem');
      assert.strictEqual(r[2].response, '#vote2 => Ipsum');
      assert.strictEqual(r[3].response, '#vote3 => Dolor Sit');
    });
    it('Open another voting should fail - will return current poll info', async () => {
      const r = await polls.open({ sender: owner, parameters: '-bits -title "Lorem Ipsum test?" Lorem | Ipsum | Dolor Sit' });
      assert.strictEqual(r[0].response, 'Error! Poll by cheers was already opened for "Lorem Ipsum?"! You can vote by adding hashtag #voteX into bit message');
    });
    it('Voting should be correctly in db', async () => {
      const cVote = await Poll.findOpened();
      assert.deepEqual(cVote.options, ['Lorem', 'Ipsum', 'Dolor Sit']);
      assert.deepEqual(cVote.type, 'bits');
      assert.strictEqual(cVote.title, 'Lorem Ipsum?');
      vid = cVote.id;
    });
    it(`!vote should return correct vote status`, async () => {
      await time.waitMs(1000);
      await message.prepare();

      const r = await polls.main({ sender: owner, parameters: ''  });
      assert.strictEqual(r[0].response, '$sender, current status of poll "Lorem Ipsum?":');
      assert.strictEqual(r[1].response, `#vote1 - Lorem - 0 ${getLocalizedName(0, translate('systems.polls.votes'))}, 0.00%`);
      assert.strictEqual(r[2].response, `#vote2 - Ipsum - 0 ${getLocalizedName(0, translate('systems.polls.votes'))}, 0.00%`);
      assert.strictEqual(r[3].response, `#vote3 - Dolor Sit - 0 ${getLocalizedName(0, translate('systems.polls.votes'))}, 0.00%`);
    });
    for (const o of [0,1,2,3,4]) {
      it(`User ${owner.userName} will vote for option ${o} - should fail`, async () => {
        await polls.main({ sender: owner, parameters: String(o) });
        const vote = (await Poll.findOneBy({ id: vid })).votes.find(v => v.votedBy === owner.userName);
        assert(typeof vote === 'undefined', 'Expected ' + JSON.stringify({ votedBy: owner.userName, vid }) + ' to not be found in db');
      });
    }
    it(`10 users will vote through bits for option 1 and another 10 for option 2`, async () => {
      for (const o of [1,2]) {
        for (let i = 0; i < 10; i++) {
          const user = 'user' + [o, i].join('');
          const TMI = require('../../../dest/services/twitch/chat').default;
          const tmi = new TMI();
          await tmi.cheer({
            userName: user,
            userId:   String(Math.floor(Math.random() * 100000)),
          },
          'Cool I am voting for #vote' + o + ' enjoy!',
          10,
          );

          await until(async (setError) => {
            try {
              const vote = (await Poll.findOneBy({ id: vid })).votes.find(v => v.votedBy === user);
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

      const r = await polls.main({ sender: owner, parameters: ''  });
      assert.strictEqual(r[0].response, '$sender, current status of poll "Lorem Ipsum?":');
      assert.strictEqual(r[1].response, `#vote1 - Lorem - 100 ${getLocalizedName(100, translate('systems.polls.votes'))}, 50.00%`);
      assert.strictEqual(r[2].response, `#vote2 - Ipsum - 100 ${getLocalizedName(100, translate('systems.polls.votes'))}, 50.00%`);
      assert.strictEqual(r[3].response, `#vote3 - Dolor Sit - 0 ${getLocalizedName(0, translate('systems.polls.votes'))}, 0.00%`);
    });

    it('Close voting', async () => {
      await time.waitMs(1000);
      await message.prepare();

      const r = await polls.close({ sender: owner });
      assert.strictEqual(r[0].response, 'Poll "Lorem Ipsum?" closed, status of voting:');
      assert.strictEqual(r[1].response, `#vote1 - Lorem - 100 ${getLocalizedName(100, translate('systems.polls.votes'))}, 50.00%`);
      assert.strictEqual(r[2].response, `#vote2 - Ipsum - 100 ${getLocalizedName(100, translate('systems.polls.votes'))}, 50.00%`);
      assert.strictEqual(r[3].response, `#vote3 - Dolor Sit - 0 ${getLocalizedName(0, translate('systems.polls.votes'))}, 0.00%`);
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
      const r = await polls.main({ sender: { userName: user }, parameters: '1' });
      assert.strictEqual(r[0].response, '$sender, there is currently no poll in progress!');
    });
  });
});
