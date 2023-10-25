/* global describe it before */

import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js'

import { User } from '../../../dest/database/entity/user.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import eventlist from '../../../dest/overlays/eventlist.js';
import twitch from '../../../dest/services/twitch.js';
import { db } from '../../general.js';
import { time } from '../../general.js';
import { message } from '../../general.js';
import { user } from '../../general.js';

import('../../general.js');

describe('lib/twitch - subs() - @func2', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('Set viewer, viewer2, viewer3 as subs', async () => {
    for (const u of [user.viewer, user.viewer2, user.viewer3]) {
      await AppDataSource.getRepository(User).save({
        userId: u.userId, userName: u.userName, isSubscriber: true,
      });
    }
  });

  it('add user.viewer to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event:  'sub',
      userId: user.viewer.userId,
    });
  });

  it('add user.viewer2 to event', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event:  'sub',
      userId: user.viewer2.userId,
    });
  });

  it('!subs should return user.viewer2', async () => {
    const r = await twitch.subs({ sender: user.viewer });
    assert.strictEqual(r[0].response, prepare('subs', {
      lastSubAgo:      'a few seconds ago',
      lastSubUsername: user.viewer2.userName,
      onlineSubCount:  0,
    }));
  });

  it('add user.viewer3 to events', async () => {
    await time.waitMs(100);
    await eventlist.add({
      event:  'sub',
      userId: user.viewer3.userId,
    });
  });

  it('!subs should return user.viewer3', async () => {
    const r = await twitch.subs({ sender: user.viewer });
    assert.strictEqual(r[0].response, prepare('subs', {
      lastSubAgo:      'a few seconds ago',
      lastSubUsername: user.viewer3.userName,
      onlineSubCount:  0,
    }));
  });

  it('Add user.viewer, user.viewer2, user.viewer3 to online users', async () => {
    await AppDataSource.getRepository(User).update({}, { isOnline: true });
  });

  it('!subs should return user.viewer3 and 3 online subs', async () => {
    const r = await twitch.subs({ sender: user.viewer });
    assert.strictEqual(r[0].response, prepare('subs', {
      lastSubAgo:      'a few seconds ago',
      lastSubUsername: user.viewer3.userName,
      onlineSubCount:  3,
    }));
  });
});
