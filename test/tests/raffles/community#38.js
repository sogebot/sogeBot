/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const _ = require('lodash');
const commons = require('../../../dest/commons');

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Raffle } = require('../../../dest/database/entity/raffle');

const raffles = (require('../../../dest/systems/raffles')).default;

const assert = require('assert');

const owner = { username: 'soge__', userId: Number(_.random(999999, false)) };

describe('/t/raffle-everyone-can-join-even-raffle-runned-for-subscribers/38', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Create subscribers raffle', async () => {
    raffles.open({ sender: owner, parameters: '!winme -for subscribers' });
    await message.isSent('raffles.announce-raffle', { username: 'bot' }, {
      keyword: '!winme',
      eligibility: await commons.prepare('raffles.eligibility-subscribers-item'),
    });
  });

  const users = ['user1', 'user2'];
  for (const [id, v] of Object.entries(users)) {
    it('Add user ' + v + ' to db', async () => {
      await getRepository(User).save({ username: v , userId: Number('100' + id) });
    });

    it('Add user ' + v + ' to raffle should fail', async () => {
      const a = await raffles.participate({ sender: { username: v, userId: Number('100' + id) }, message: '!winme' });
      assert(!a);
    });

    it('User should not be in raffle', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });

      assert(typeof raffle.participants.find(o => o.username === v) === 'undefined');
    });
  }

  const followers = ['follower1', 'follower2'];
  for (const [id, v] of Object.entries(followers)) {
    it('Add user ' + v + ' to db', async () => {
      await getRepository(User).save({ username: v , userId: Number('100' + id), isFollower: true });
    });

    it('Add user ' + v + ' to raffle should fail', async () => {
      const a = await raffles.participate({ sender: { username: v, userId: Number('100' + id) }, message: '!winme' });
      assert(!a);
    });

    it('User should not be in raffle', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });

      assert(typeof raffle.participants.find(o => o.username === v) === 'undefined');
    });
  }

  const subs = ['sub1', 'sub2'];
  for (const [id, v] of Object.entries(subs)) {
    it('Add user ' + v + ' to db', async () => {
      await getRepository(User).save({ username: v , userId: Number('100' + id), isSubscriber: true });
    });

    it('Add user ' + v + ' to raffle', async () => {
      const a = await raffles.participate({ sender: { username: v, userId: Number('100' + id) }, message: '!winme' });
      assert(a);
    });

    it('User should be in raffle', async () => {
      const raffle = await getRepository(Raffle).findOne({
        relations: ['participants'],
        where: { winner: null, isClosed: false },
      });

      assert(typeof raffle.participants.find(o => o.username === v) !== 'undefined');
    });
  }
});
