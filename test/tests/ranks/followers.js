/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

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
      ranks.add({ sender: owner, parameters: `${rank.hours} ${rank.rank}` });
      await message.isSent('ranks.rank-was-added', owner,
        {
          sender: owner.username,
          rank: rank.rank,
          hours: rank.hours,
          type: 'viewer',
          hlocale: getLocalizedName(rank.hours, 'core.hours'),
        });
    });
  }

  for (const rank of flwranks) {
    it(`Add follower rank '${rank.rank}`, async () => {
      ranks.addflw({ sender: owner, parameters: `${rank.months} ${rank.rank}` });
      await message.isSent('ranks.rank-was-added', owner,
        {
          sender: owner.username,
          rank: rank.rank,
          hours: rank.months,
          type: 'follower',
          hlocale: getLocalizedName(rank.months, 'core.months'),
        });
    });
  }

  const users = ['user1', 'user2', 'user3'];
  const expectedMessage = [
    '@user1, you have Zero rank. Next rank - Eight Follower 0.0% (8.0 months)',
    '@user2, you have Zero rank. Next rank - Eight Follower 62.5% (3.0 months)',
    '@user3, you have Eight Follower rank',
  ];
  for (const [id, v] of Object.entries(users)) {
    it('Add user ' + v + ' to db', async () => {
      await getRepository(User).save({ username: v , userId: Number('100' + id), isFollower: true, followedAt: new Date((new Date()).setMonth((new Date()).getMonth()-(id * 5))).getTime(), watchedTime: id * 1000 * 60 * 60 });
    });

    it('Rank of user should be correct', async () => {
      await ranks.main({ sender: { userId: Number('100' + id), username: v }});
    });

    it('Should have expected message', async () => {
      await message.isSentRaw(expectedMessage[id], { username: v });
    });
  }
});
