/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

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

describe('lib/twitch - followers()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Set testuser, testuser2, testuser3 as followers', async () => {
    for (const u of [testuser, testuser2, testuser3]) {
      await getRepository(User).save({ userId: u.id, username: u.username, isFollower: true });
    }
  });

  it('add testuser to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event: 'follow',
      username: 'testuser',
    });
  });

  it('add testuser2 to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event: 'follow',
      username: 'testuser2',
    });
  });

  it('!followers should return testuser2', async () => {
    const r = await twitch.followers({ sender: testuser });
    assert.strictEqual(r[0].response, prepare('followers', {
      lastFollowAgo: 'a few seconds ago',
      lastFollowUsername: testuser2.username,
      onlineFollowersCount: 0,
    }));
  });

  it('add testuser3 to events', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event: 'follow',
      username: 'testuser3',
    });
  });

  it('!followers should return testuser3', async () => {
    const r = await twitch.followers({ sender: testuser });
    assert.strictEqual(r[0].response, prepare('followers', {
      lastFollowAgo: 'a few seconds ago',
      lastFollowUsername: testuser3.username,
      onlineFollowersCount: 0,
    }));
  });

  it('Add testuser, testuser2, testuser3 to online users', async () => {
    await getRepository(User).update({}, { isOnline: true });
  });

  it('!followers should return testuser3 and 3 online followers', async () => {
    const r = await twitch.followers({ sender: testuser });
    assert.strictEqual(r[0].response, prepare('followers', {
      lastFollowAgo: 'a few seconds ago',
      lastFollowUsername: testuser3.username,
      onlineFollowersCount: 3,
    }));
  });
});
