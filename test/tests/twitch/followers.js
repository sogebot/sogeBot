const assert = require('assert');

const { getRepository } = require('typeorm');

const { User } = require('../../../dest/database/entity/user');
const { prepare } = require('../../../dest/helpers/commons/prepare');
const eventlist = (require('../../../dest/overlays/eventlist')).default;
const twitch = (require('../../../dest/services/twitch')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

require('../../general.js');

describe('lib/twitch - followers() - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('Set user.viewer, user.viewer2, user.viewer3 as followers', async () => {
    for (const u of [user.viewer, user.viewer2, user.viewer3]) {
      await getRepository(User).save({
        userId: u.userId, userName: u.userName,
      });
    }
  });

  it('add user.viewer to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event:  'follow',
      userId: user.viewer.userId,
    });
  });

  it('add user.viewer2 to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event:  'follow',
      userId: user.viewer2.userId,
    });
  });

  it('!followers should return user.viewer2', async () => {
    const r = await twitch.followers({ sender: user.viewer });
    assert.strictEqual(r[0].response, prepare('followers', {
      lastFollowAgo:      'a few seconds ago',
      lastFollowUsername: user.viewer2.userName,
    }));
  });

  it('add user.viewer3 to events', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event:  'follow',
      userId: user.viewer3.userId,
    });
  });

  it('!followers should return user.viewer3', async () => {
    const r = await twitch.followers({ sender: user.viewer });
    assert.strictEqual(r[0].response, prepare('followers', {
      lastFollowAgo:      'a few seconds ago',
      lastFollowUsername: user.viewer3.userName,
    }));
  });
});
