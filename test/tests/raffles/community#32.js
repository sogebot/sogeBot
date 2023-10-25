/* global describe it before */

import('../../general.js');

import assert from 'assert';

import _ from 'lodash-es';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../../../dest/database.js';

import { Raffle } from '../../../dest/database/entity/raffle.js';
import { User } from '../../../dest/database/entity/user.js';
import { getOwnerAsSender } from '../../../dest/helpers/commons/getOwnerAsSender.js';
import raffles from '../../../dest/systems/raffles.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

const max = Math.floor(Number.MAX_SAFE_INTEGER / 10000000);

const owner = { userName: '__broadcaster__', userId: String(_.random(999999, false)) };
const testuser = { userName: 'testuser', userId: String(_.random(999999, false)) };
const testuser2 = { userName: 'testuser2', userId: String(_.random(999999, false)) };

describe('/t/raffle-owner-can-join-raffle-more-then-1-time/32 - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('create normal raffle', async () => {
    raffles.open({ sender: owner, parameters: '!winme' });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme". Raffle is opened for everyone.', { userName: '__bot__' });
  });

  it('loop through owner participations', async () => {
    for (let i = 0; i < 100; i++) {
      const a = await raffles.participate({ sender: getOwnerAsSender(), message: `!winme` });
      assert(a);
    }
  });

  it('expecting only one participator', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where:     { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants.length === 1);
  });
});
