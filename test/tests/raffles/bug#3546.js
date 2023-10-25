
/* global*/

import('../../general.js');
import assert from 'assert';
import { IsNull } from 'typeorm';

import * as commons from '../../../dest/commons.js'
import { AppDataSource } from '../../../dest/database.js';
import { Raffle } from '../../../dest/database/entity/raffle.js';
import { User } from '../../../dest/database/entity/user.js';
import * as changelog from '../../../dest/helpers/user/changelog.js';
import raffles from '../../../dest/systems/raffles.js';
import { db, message, user } from '../../general.js';

describe('Raffles - raffle with 1 point cannot over point #3546 - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    raffles.allowOverTicketing = true;
  });

  it('create ticket raffle', async () => {
    raffles.open({ sender: user.owner, parameters: '!winme -min 0 -max 500' });
    await message.isSentRaw('Raffle is running (0 entries). To enter type "!winme <1-500>". Raffle is opened for everyone.', { userName: '__bot__' });
  });

  it('Update viewer to have 1 point', async () => {
    await AppDataSource.getRepository(User).save({
      userName: user.viewer.userName, userId: user.viewer.userId, points: 1,
    });
  });

  it('Viewer bets over 10 points', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
    assert(a);
  });

  it('expecting 1 participant to have bet of 1', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where:     { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants.length === 1);
    assert(raffle.participants[0].tickets === 1);
  });

  it('Viewer bets over 10 points again', async () => {
    const a = await raffles.participate({ sender: user.viewer, message: '!winme 100' });
    assert(a);
  });

  it('expecting 1 participant to have bet of 1', async () => {
    const raffle = await AppDataSource.getRepository(Raffle).findOne({
      relations: ['participants'],
      where:     { winner: IsNull(), isClosed: false },
    });
    assert(raffle.participants.length === 1);
    assert(raffle.participants[0].tickets === 1);
  });

  it('User should have 0 points', async () => {
    await changelog.flush();
    const result = await AppDataSource.getRepository(User).findOneBy({ userName: user.viewer.userName, userId: user.viewer.userId });
    assert(result.points === 0);
  });
});
