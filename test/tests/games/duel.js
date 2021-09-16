/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');

const assert = require('assert');

const _ = require('lodash');
const { getRepository } = require('typeorm');

const { Duel } = require('../../../dest/database/entity/duel');
const { User } = require('../../../dest/database/entity/user');
const duel = (require('../../../dest/games/duel')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const user1 = { username: 'user1', userId: String(_.random(999999, false)) };
const user2 = { username: 'user2', userId: String(_.random(999999, false)) };
const command = '!duel';

describe('Gambling - duel', () => {
  describe('!duel bank', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('Bank should be empty at start', async () => {
      const responses = await duel.bank({ sender: user1 });
      assert(responses[0].response === '$sender, current bank for !duel is 0 points', JSON.stringify({ responses }));
    });

    it('Add 200 points to duel bank', async () => {
      for (let i = 0; i < 200; i++) {
        await getRepository(Duel).save({
          tickets: 1, username: 'user' + i, id: i,
        });
      }
      const items = await getRepository(Duel).find();
      assert.strictEqual(items.length, 200);
    });

    it('Bank should have 200 tickets', async () => {
      const responses = await duel.bank({ sender: user1 });
      assert(responses[0].response === '$sender, current bank for !duel is 200 points', JSON.stringify({ responses }));
    });
  });

  describe('#914 - user1 is not correctly added to duel, if he is challenger', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('set duel timestamp to 0 to force new duel', async () => {
      duel._timestamp = 0;
    });

    it('add points for users', async () => {
      await getRepository(User).save({
        userId: user1.userId, username: user1.username, points: 100,
      });
      await getRepository(User).save({
        userId: user2.userId, username: user2.username, points: 100,
      });
    });

    it('user 1 is challenging', async () => {
      const responses = await duel.main({
        sender: user1, parameters: 'all', command,
      });
      assert(responses[0].response === '$sender, good luck with your dueling skills. You bet on yourself 100 points!', JSON.stringify({ responses }));
      // this is announced
      await message.isSentRaw('@user1 is your new duel challenger! To participate use !duel [points], you have 5 minutes left to join.');
    });

    it('user 2 is added to duel', async () => {
      const responses = await duel.main({
        sender: user2, parameters: 'all', command,
      });
      assert(responses[0].response === '$sender, good luck with your dueling skills. You bet on yourself 100 points!', JSON.stringify({ responses }));
    });

    it('set duel timestamp to force duel to end', async () => {
      // cannot set as 0 - duel is then ignored
      duel._timestamp = 1;
    });

    it('call pickDuelWinner()', () => {
      duel.pickDuelWinner();
    });

    it('winner should be announced', async () => {
      await message.isSentRaw([
        'Congratulations to @user1! He is last man standing and he won 200 points (50% with bet of 100 points)!',
        'Congratulations to @user2! He is last man standing and he won 200 points (50% with bet of 100 points)!',
      ], { username: '__bot_username__' });
    });
  });

  describe('Pick winner from huge tickets', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('create duel', async () => {
      duel._timestamp = Number(new Date());

      for (const [id, username] of Object.entries(['testuser', 'testuser2', 'testuser3', 'testuser4', 'testuser5'])) {
        const tickets = Math.floor(Number.MAX_SAFE_INTEGER / 10000000);
        await getRepository(Duel).save({
          id: Number(id), username, tickets: tickets,
        });
      }
    });

    it('pick winner - bot should not crash', async () => {
      await duel.pickDuelWinner();
    });
  });

  describe('Create duel with zero bet', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('set duel timestamp to 0 to force new duel', async () => {
      duel._timestamp = 0;
    });

    it('user 1 is challenging with zero points and should fail', async () => {
      const responses = await duel.main({
        sender: user1, parameters: '0', command,
      });
      assert(responses[0].response === '$sender, you cannot duel 0 points', JSON.stringify({ responses }));
    });
  });

  describe('Create duel with not enough points', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('set duel timestamp to 0 to force new duel', async () => {
      duel._timestamp = 0;
    });

    it('add points for users', async () => {
      await getRepository(User).save({
        userId: user1.userId, username: user1.username, points: 4,
      });
    });

    it('user 1 is challenging with not enough points', async () => {
      const responses = await duel.main({
        sender: user1, parameters: '5', command,
      });
      assert(responses[0].response === '$sender, you don\'t have 5 points to duel!', JSON.stringify({ responses }));
    });
  });

  describe('Create duel with not enough points', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });
    after(() => {
      duel.minimalBet = 0;
    });

    it('set duel timestamp to 0 to force new duel', async () => {
      duel._timestamp = 0;
    });

    it('set duel minimal bet to 10', async () => {
      duel.minimalBet = 10;
    });

    it('add points for users', async () => {
      await getRepository(User).save({
        userId: user1.userId, username: user1.username, points: 100,
      });
    });

    it('user 1 is challenging with not enough points', async () => {
      const responses = await duel.main({
        sender: user1, parameters: '5', command,
      });
      assert(responses[0].response === '$sender, minimal bet for !duel is 10 points', JSON.stringify({ responses }));
    });
  });

  describe('Duel should be cleared on pickDuelWinner()', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('set duel timestamp to 1 to clean up duel', async () => {
      duel._timestamp = 1;
    });

    it('pickDuelWinner should clean duel', async () => {
      await duel.pickDuelWinner();
    });

    it('timestamp should be reset', async () => {
      assert.strictEqual(duel._timestamp, 0);
    });
  });
});

describe('User joins duel twice', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('set duel timestamp to 0 to force new duel', async () => {
    duel._timestamp = 0;
  });

  it('add points for users', async () => {
    await getRepository(User).save({
      userId: user1.userId, username: user1.username, points: 100,
    });
  });

  it('user 1 is challenging with 50 points', async () => {
    const responses = await duel.main({
      sender: user1, parameters: '50', command,
    });
    assert(responses[0].response === '$sender, good luck with your dueling skills. You bet on yourself 50 points!', JSON.stringify({ responses }));
  });

  it('user 1 is challenging with 50 points again', async () => {
    const responses = await duel.main({
      sender: user1, parameters: '50', command,
    });
    assert(responses[0].response === '$sender really thinks he is better than others raising his bet to 100 points!', JSON.stringify({ responses }));
  });
});

describe('Duel is on cooldown without bypass by mods', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });
  after(() => {
    duel.cooldown = 0;
  });

  it('set cooldown to 10 minutes', async () => {
    duel.cooldown = 600;
  });

  it('set manually internal cooldown', async () => {
    duel._cooldown = Date.now();
  });

  it('set duel timestamp to 0 to force new duel', async () => {
    duel._timestamp = 0;
  });

  it('add points for users', async () => {
    await getRepository(User).save({
      userId: user1.userId, username: user1.username, points: 100,
    });
    await getRepository(User).save({
      userId: user.owner.userId, username: user.owner.username, points: 100,
    });
    await getRepository(User).save({
      userId: user.mod.userId, username: user.mod.username, points: 100,
    });
  });

  it('user 1 is challenging and should be on cooldown', async () => {
    const responses = await duel.main({
      sender: user1, parameters: '50', command,
    });
    assert(responses[0].response === '$sender, you cannot use !duel for 10 minutes.', JSON.stringify({ responses }));
  });

  it('owner is challenging and should be on cooldown', async () => {
    const responses = await duel.main({
      sender: user.owner, parameters: '50', command,
    });
    assert(responses[0].response === '$sender, you cannot use !duel for 10 minutes.', JSON.stringify({ responses }));
  });

  it('mod is challenging and should be on cooldown', async () => {
    const responses = await duel.main({
      sender: user.mod, parameters: '50', command,
    });
    assert(responses[0].response === '$sender, you cannot use !duel for 10 minutes.', JSON.stringify({ responses }));
  });
});

describe('Duel is on cooldown with bypass by mods', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });
  after(() => {
    duel.cooldown = 0;
    duel.bypassCooldownByOwnerAndMods = false;
  });

  it('set cooldown to 10 minutes', async () => {
    duel.cooldown = 600;
  });

  it('set bypass by mods and owner', async () => {
    duel.bypassCooldownByOwnerAndMods = true;
  });

  it('set manually internal cooldown', async () => {
    duel._cooldown = Date.now();
  });

  it('set duel timestamp to 0 to force new duel', async () => {
    duel._timestamp = 0;
  });

  it('add points for users', async () => {
    await getRepository(User).save({
      userId: user1.userId, username: user1.username, points: 100,
    });
    await getRepository(User).save({
      userId: user.owner.userId, username: user.owner.username, points: 100,
    });
    await getRepository(User).save({
      userId: user.mod.userId, username: user.mod.username, points: 100,
    });
  });

  it('user 1 is challenging and should be on cooldown', async () => {
    const responses = await duel.main({
      sender: user1, parameters: '50', command,
    });
    assert(responses[0].response === '$sender, you cannot use !duel for 10 minutes.', JSON.stringify({ responses }));
  });

  it('owner is challenging and should not be on cooldown', async () => {
    const responses = await duel.main({
      sender: user.owner, parameters: '50', command,
    });
    assert(responses[0].response === '$sender, good luck with your dueling skills. You bet on yourself 50 points!', JSON.stringify({ responses }));
  });

  it('reset duel', async () => {
    await getRepository(Duel).clear();
    duel._timestamp = 0;
    duel._cooldown = Date.now();
  });

  it('mod is challenging and should not be on cooldown', async () => {
    const responses = await duel.main({
      sender: user.mod, parameters: '50', command,
    });
    assert(responses[0].response === '$sender, good luck with your dueling skills. You bet on yourself 50 points!', JSON.stringify({ responses }));
  });
});