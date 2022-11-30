/* global */
const assert = require('assert');
const { AppDataSource } = require('../../../dest/database.js');

require('../../general.js');

const { User } = require('../../../dest/database/entity/user');
const changelog = (require('../../../dest/helpers/user/changelog'));
const db = require('../../general.js').db;
const time = require('../../general.js').time;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('TMI - subcommunitygift after gifts should be ignored - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('Trigger subcommunitygift', async () => {
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.subscriptionGiftCommunity(user.viewer.userName, {
      gifterUserId: user.viewer.userId,
      count:        5,
    });
  });

  it('Trigger subgift 1', async () => {
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.subgift(user.viewer2.userName, { gifter: user.viewer.userName, gifterUserId: user.viewer.userId, months: 1, userId: user.viewer2.userId, isPrime: true });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer2__#3');
  });

  it('Trigger subgift 2', async () => {
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.subgift(user.viewer3.userName, { gifter: user.viewer.userName, gifterUserId: user.viewer.userId, months: 1, userId: user.viewer3.userId, isPrime: true });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer3__#5');
  });

  it('Trigger subgift 3', async () => {
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.subgift(user.viewer4.userName, { gifter: user.viewer.userName, gifterUserId: user.viewer.userId, months: 1, userId: user.viewer4.userId, isPrime: true });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer4__#50');
  });

  it('Trigger subgift 4', async () => {
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.subgift(user.viewer5.userName, { gifter: user.viewer.userName, gifterUserId: user.viewer.userId, months: 1, userId: user.viewer5.userId, isPrime: true });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer5__#55');
  });

  it('Trigger subgift 5', async () => {
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.subgift(user.viewer6.userName, { gifter: user.viewer.userName, gifterUserId: user.viewer.userId, months: 1, userId: user.viewer6.userId, isPrime: true });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer6__#56');
  });

  it('Trigger subgift 6 > should be triggered', async () => {
    const TMI = require('../../../dest/services/twitch/chat').default;
    const tmi = new TMI();
    tmi.subgift(user.viewer7.userName, { gifter: user.viewer.userName, gifterUserId: user.viewer.userId, months: 1, userId: user.viewer7.userId, isPrime: true });
    await message.debug('tmi.subgift', 'Triggered: __viewer__#1 -> __viewer7__#57');
  });

  it('Viewer1 should have 6 subgifts', async () => {
    await time.waitMs(1000);
    await changelog.flush();
    const _user = await AppDataSource.getRepository(User).findOneBy({ userId: user.viewer.userId });
    assert(_user.giftedSubscribes === 6, `Expected 6 (5 community + 1 normal) subgifts, got ${_user.giftedSubscribes} subgifts`);
  });
});