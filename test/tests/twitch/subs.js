/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const time = require('../../general.js').time;
const message = require('../../general.js').message;

const moment = require('moment');
const assert = require('assert');
const { prepare } = require('../../../dest/commons');

const testuser = { username: 'testuser', id: Math.floor(Math.random() * 1000) };
const testuser2 = { username: 'testuser2', id: Math.floor(Math.random() * 1000) };
const testuser3 = { username: 'testuser3', id: Math.floor(Math.random() * 1000) };

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const twitch = (require('../../../dest/twitch')).default;
const eventlist = (require('../../../dest/overlays/eventlist')).default;

describe('lib/twitch - subs()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Set testuser, testuser2, testuser3 as subs', async () => {
    for (const u of [testuser, testuser2, testuser3]) {
      await getRepository(User).save({ userId: u.id, username: u.username, isSubscriber: true });
    }
  });

  it('add testuser to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event: 'sub',
      username: 'testuser',
    });
  });

  it('add testuser2 to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event: 'sub',
      username: 'testuser2',
    });
  });

  it('!subs should return testuser2', async () => {
    const r = await twitch.subs({ sender: testuser });
    assert.strictEqual(r[0].response, prepare('subs', {
      lastSubAgo: 'a few seconds ago',
      lastSubUsername: testuser2.username,
      onlineSubCount: 0,
    }));
  });

  it('add testuser3 to events', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event: 'sub',
      username: 'testuser3',
    });
  });

  it('!subs should return testuser3', async () => {
    const r = await twitch.subs({ sender: testuser });
    assert.strictEqual(r[0].response, prepare('subs', {
      lastSubAgo: 'a few seconds ago',
      lastSubUsername: testuser3.username,
      onlineSubCount: 0,
    }));
  });

  it('Add testuser, testuser2, testuser3 to online users', async () => {
    await getRepository(User).update({}, { isOnline: true });
  });

  it('!subs should return testuser3 and 3 online subs', async () => {
    const r = await twitch.subs({ sender: testuser });
    assert.strictEqual(r[0].response, prepare('subs', {
      lastSubAgo: 'a few seconds ago',
      lastSubUsername: testuser3.username,
      onlineSubCount: 3,
    }));
  });
});
