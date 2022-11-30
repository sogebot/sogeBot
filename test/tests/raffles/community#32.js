/* global describe it before */

require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { IsNull } = require('typeorm');
const { AppDataSource } = require('../../../dest/database.js');

const { Raffle } = require('../../../dest/database/entity/raffle');
const { User } = require('../../../dest/database/entity/user');
const { getOwnerAsSender } = require('../../../dest/helpers/commons/getOwnerAsSender');
const raffles = (require('../../../dest/systems/raffles')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

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
