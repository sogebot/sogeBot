/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');

const { getLocalizedName } = require('../../../dest/commons');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const ranks = (require('../../../dest/systems/ranks')).default;

// users
const owner = { userId: Math.floor(Math.random() * 100000), username: 'soge__' };

const vwrranks = [
  { hours: 0, rank: 'Zero'},
  { hours: 2, rank: 'Two'},
  { hours: 4, rank: 'Four'},
  { hours: 6, rank: 'Six'},
  { hours: 8, rank: 'Eight'},
];

const flwranks = [
  { months: 8, rank: 'Eight Follower'},
];

describe('Ranks - followers', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  for (const rank of vwrranks) {
    it(`Add rank '${rank.rank}`, async () => {
      const r = await ranks.add({ sender: owner, parameters: `${rank.hours} ${rank.rank}` });
      assert.strictEqual(r[0].response, `$sender, new rank viewer ${rank.rank}(${rank.hours}hours) was added`);
    });
  }

  for (const rank of flwranks) {
    it(`Add follower rank '${rank.rank}`, async () => {
      const r = await ranks.addflw({ sender: owner, parameters: `${rank.months} ${rank.rank}` });
      assert.strictEqual(r[0].response, `$sender, new rank follower ${rank.rank}(${rank.months}months) was added`);
    });
  }

  const users = ['user1', 'user2', 'user3'];
  const expectedMessage = [
    '$sender, you have Zero rank. Next rank - Eight Follower 0.0% (8.0 months)',
    '$sender, you have Zero rank. Next rank - Eight Follower 62.5% (3.0 months)',
    '$sender, you have Eight Follower rank',
  ];
  for (const [id, v] of Object.entries(users)) {
    it('Add user ' + v + ' to db', async () => {
      await getRepository(User).save({ username: v , userId: Number('100' + id), isFollower: true, followedAt: new Date((new Date()).setMonth((new Date()).getMonth()-(id * 5))).getTime(), watchedTime: id * 1000 * 60 * 60 });
    });

    it('Rank of user should be correct', async () => {
      const r = await ranks.main({ sender: { userId: Number('100' + id), username: v }});
      assert.strictEqual(r[0].response, expectedMessage[id]);
    });
  }
});
