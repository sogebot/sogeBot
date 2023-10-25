import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { User } from '../../../dest/database/entity/user.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import eventlist from '../../../dest/overlays/eventlist.js';
import twitch from '../../../dest/services/twitch.js';
import { db } from '../../general.js';
import { message } from '../../general.js';
import { time } from '../../general.js';
import { user } from '../../general.js';

import('../../general.js');

describe('lib/twitch - followers() - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('Set user.viewer, user.viewer2, user.viewer3 as followers', async () => {
    for (const u of [user.viewer, user.viewer2, user.viewer3]) {
      await AppDataSource.getRepository(User).save({
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
