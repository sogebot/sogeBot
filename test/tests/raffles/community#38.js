require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { IsNull } = require('typeorm');

const commons = require('../../../dest/commons');
const { AppDataSource } = require('../../../dest/database.js');
const { Raffle } = require('../../../dest/database/entity/raffle');
const { User } = require('../../../dest/database/entity/user');
const raffles = (require('../../../dest/systems/raffles')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

const owner = { userName: '__broadcaster__', userId: String(_.random(999999, false)) };

describe('/t/raffle-everyone-can-join-even-raffle-runned-for-subscribers/38 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Create subscribers raffle', async () => {
    raffles.open({ sender: owner, parameters: '!winme -for subscribers.' });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme". Raffle is opened for subscribers.', { userName: '__bot__' });
  });

  const users = ['user1', 'user2'];
  for (const [id, v] of Object.entries(users)) {
    it('Add user ' + v + ' to db', async () => {
      await AppDataSource.getRepository(User).save({ userName: v , userId: String('100' + id) });
    });

    it('Add user ' + v + ' to raffle should fail', async () => {
      const a = await raffles.participate({ sender: { userName: v, userId: String('100' + id) }, message: '!winme' });
      assert(!a);
    });

    it('User should not be in raffle', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where:     { winner: IsNull(), isClosed: false },
      });

      assert(typeof raffle.participants.find(o => o.userName === v) === 'undefined');
    });
  }

  const subs = ['sub1', 'sub2'];
  for (const [id, v] of Object.entries(subs)) {
    it('Add user ' + v + ' to db', async () => {
      await AppDataSource.getRepository(User).save({
        userName: v , userId: String('100' + id), isSubscriber: true,
      });
    });

    it('Add user ' + v + ' to raffle', async () => {
      const a = await raffles.participate({ sender: { userName: v, userId: String('100' + id) }, message: '!winme' });
      assert(a);
    });

    it('User should be in raffle', async () => {
      const raffle = await AppDataSource.getRepository(Raffle).findOne({
        relations: ['participants'],
        where:     { winner: IsNull(), isClosed: false },
      });

      assert(typeof raffle.participants.find(o => o.username === v) !== 'undefined');
    });
  }
});
