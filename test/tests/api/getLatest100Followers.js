/* global describe it before, after */


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

const assert = require('assert');

const oauth = (require('../../../dest/oauth')).default;
const api = (require('../../../dest/api')).default;
const events = (require('../../../dest/events')).default;

describe('API - getLatest100Followers()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    oauth.channelId = '12345';
    oauth.botAccessToken = 'foobar';
    oauth.botUsername = '__bot_username__';
  });

  after(() => {
    oauth.channelId = '';
    oauth.botAccessToken = '';
  });

  describe('Example data', () => {
    // we are using mock https://api.twitch.tv/helix/users/follows?to_id=12345&first=100

    it('should be properly parsed', async () => {
      const status = await api.getLatest100Followers(false);
      assert(status.state, 'getLatest100Followers() unexpectedly failed');
    });

    it('should be two follow events after while', async () => {
      await time.waitMs(5000);
      assert(events.fire.callCount === 2);
    });

    it('follow events should have correct usernames', async () => {
      assert(events.fire.calledWith('follow', { username: 'testfollow', userId: 111 }));
      assert(events.fire.calledWith('follow', { username: 'testfollow2', userId: 222 }));
    });

    it('second call should be properly parsed', async () => {
      const status = await api.getLatest100Followers(false);
      assert(status.state, 'getLatest100Followers() unexpectedly failed');
    });

    it('should be two follow events, expecting no change', async () => {
      await time.waitMs(5000);
      assert(events.fire.callCount === 2);
    });

    it('follow events should have correct usernames', async () => {
      assert(events.fire.calledWith('follow', { username: 'testfollow', userId: 111 }));
      assert(events.fire.calledWith('follow', { username: 'testfollow2', userId: 222 }));
    });
  });
});
