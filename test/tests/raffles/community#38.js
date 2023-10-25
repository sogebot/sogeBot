import('../../general.js');

import assert from 'assert';

import _ from 'lodash-es';
import { IsNull } from 'typeorm';

import * as commons from '../../../dest/commons.js'
import { AppDataSource } from '../../../dest/database.js';
import { Raffle } from '../../../dest/database/entity/raffle.js';
import { User } from '../../../dest/database/entity/user.js';
import raffles from '../../../dest/systems/raffles.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

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
