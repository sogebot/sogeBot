/* global describe it before */
const assert = require('assert');

require('../../general.js');

const { getRepository } = require('typeorm');

const { User } = require('../../../dest/database/entity/user');
const tmi = (require('../../../dest/tmi')).default;
const db = require('../../general.js').db;
const time = require('../../general.js').time;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('TMI - subcommunitygift after gifts should be ignored', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('Trigger subcommunitygift', async () => {
    tmi.subscriptionGiftCommunity({
      tags: {
        login:  '__viewer__',
        userId: '1',
      },
      parameters: { massGiftCount: 5 },
    });
  });

  it('Trigger subgift 1', async () => {
    tmi.subgift({
      tags: {
        login:  '__viewer__',
        userId: '1',
      },
      parameters: {
        months:            2,
        recipientUserName: '__viewer2__',
        recipientId:       '3',
      },
    });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer2__#3');
  });

  it('Trigger subgift 2', async () => {
    tmi.subgift({
      tags: {
        login:  '__viewer__',
        userId: '1',
      },
      parameters: {
        months:            2,
        recipientUserName: '__viewer3__',
        recipientId:       '5',
      },
    });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer3__#5');
  });

  it('Trigger subgift 3', async () => {
    tmi.subgift({
      tags: {
        login:  '__viewer__',
        userId: '1',
      },
      parameters: {
        months:            2,
        recipientUserName: '__viewer4__',
        recipientId:       '50',
      },
    });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> __viewer4__#50');
  });

  it('Trigger subgift 4', async () => {
    tmi.subgift({
      tags: {
        login:  '__viewer__',
        userId: '1',
      },
      parameters: {
        months:            2,
        recipientUserName: 'viewer5',
        recipientId:       '55',
      },
    });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> viewer5#55');
  });

  it('Trigger subgift 5', async () => {
    tmi.subgift({
      tags: {
        login:  '__viewer__',
        userId: '1',
      },
      parameters: {
        months:            2,
        recipientUserName: 'viewer6',
        recipientId:       '56',
      },
    });
    await message.debug('tmi.subgift', 'Ignored: __viewer__#1 -> viewer6#56');
  });

  it('Trigger subgift 6 > should be triggered', async () => {
    tmi.subgift({
      tags: {
        login:  '__viewer__',
        userId: '1',
      },
      parameters: {
        months:            2,
        recipientUserName: '__viewer7__',
        recipientId:       '57',
      },
    });
    await message.debug('tmi.subgift', 'Triggered: __viewer__#1 -> __viewer7__#57');
  });

  it('Viewer1 should have 6 subgifts', async () => {
    await time.waitMs(1000);
    const _user = await getRepository(User).findOne({ userId: user.viewer.userId });
    assert(_user.giftedSubscribes === 6, `Expected 6 (5 community + 1 normal) subgifts, got ${_user.giftedSubscribes} subgifts`);
  });
});