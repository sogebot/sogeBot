/* global describe it before */

const assert = require('assert');
const _ = require('lodash');
require('../../general.js');

const oauth = (require('../../../dest/oauth')).default;

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const {channelId} = (require('../../../dest/helpers/oauth/channelId'));

// users
const id = _.random(99999, false);
const testuser = { username: 'testuser', userId: String(id) };

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const {eventEmitter} = (require('../../../dest/helpers/events/emitter'));
const webhooks = (require('../../../dest/webhooks')).default;

describe('libs/webhooks - follower()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    channelId.value = String(_.random(9999999, false));
  });

  it('testuser should not be in webhooks cache', async () => {
    assert(!webhooks.existsInCache('follow', id));
  });

  it('add testuser (id:' + id + ') to db', async () => {
    await getRepository(User).save(testuser);
  });

  it('follow event should not be called', async () => {
    assert(!eventEmitter.emit.called);
  });

  it('testuser payload for follower() several times', async () => {
    for (let i = 0; i < 5; i++) {
      await webhooks.follower({
        data: {
          from_id: String(id),
          from_name: 'testuser',
          to_id: String(channelId.value),
          to_name: 'channeluser',
        },
      });
    }
  });

  it('testuser should be in webhooks cache', async () => {
    assert(webhooks.existsInCache('follows', id));
  });

  it('follow event should be fired only once', async () => {
    assert(eventEmitter.emit.calledOnce);
  });

  it('testuser payload for follower() several times for incorrect channel id', async () => {
    for (let i = 0; i < 5; i++) {
      await webhooks.follower({
        data: {
          from_id: '3',
          from_name: 'testuser',
          to_id: '2',
          to_name: 'channeluser',
        },
      });
    }
  });

  it('testuser should not be in webhooks cache', async () => {
    assert(!webhooks.existsInCache('follows', 3));
  });
});
