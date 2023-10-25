/* global describe it before */

import assert from 'assert';
import('../../general.js');

import { db } from '../../general.js';
import { prepare } from '../../../dest/helpers/commons/prepare.js';
import { message } from '../../general.js';

import { User } from '../../../dest/database/entity/user.js';
import { Settings } from '../../../dest/database/entity/settings.js';

import twitch from '../../../dest/services/twitch.js';

// users
const owner = { userName: '__broadcaster__' };
const testuser = { userName: 'testuser', userId: String(1) };
const testuser2 = { userName: 'testuser2', userId: String(2) };
const testuser3 = { userName: 'testuser3', userId: String(3) };
const nightbot = { userName: 'nightbot', userId: String(4) };
const botwithchangedname = { userName: 'asdsadas', userId: String(24900234) };

import { isIgnored } from '../../../dest/helpers/user/isIgnored.js';
import { AppDataSource } from '../../../dest/database.js';

describe('TMI - ignore - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    twitch.globalIgnoreListExclude = [];
    twitch.ignorelist = [];

    await AppDataSource.getRepository(User).save(testuser);
    await AppDataSource.getRepository(User).save(testuser2);
    await AppDataSource.getRepository(User).save(testuser3);
  });

  describe('Global ignore workflow', () => {
    it ('nightbot should be ignored by default', async () => {
      assert(await isIgnored(nightbot)); // checked by known_alias
    });

    it ('botwithchangedname should be ignored by default', async () => {
      assert(await isIgnored(botwithchangedname)); // checked by id
    });
  });

  describe('Ignore workflow', () => {
    it('testuser is not ignored by default', async () => {
      assert(!(await isIgnored(testuser)));
    });

    it('add testuser to ignore list', async () => {
      const r = await twitch.ignoreAdd({ sender: owner, parameters: 'testuser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { userName: 'testuser' }));
    });

    it('add @testuser2 to ignore list', async () => {
      const r = await twitch.ignoreAdd({ sender: owner, parameters: '@testuser2' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { userName: 'testuser2' }));
    });

    it('testuser should be in ignore list', async () => {
      const r = await twitch.ignoreCheck({ sender: owner, parameters: 'testuser' });

      const item = await AppDataSource.getRepository(Settings).findOne({
        where: {
          namespace: '/services/twitch',
          name: 'ignorelist',
        },
      });

      assert.strictEqual(r[0].response, prepare('ignore.user.is.ignored', { userName: 'testuser' }));
      assert(await isIgnored(testuser));
      assert(typeof item !== 'undefined');
      assert(item.value.includes('testuser'));
    });

    it('@testuser2 should be in ignore list', async () => {
      const r = await twitch.ignoreCheck({ sender: owner, parameters: '@testuser2' });
      const item = await AppDataSource.getRepository(Settings).findOne({
        where: {
          namespace: '/services/twitch',
          name: 'ignorelist',
        },
      });

      assert.strictEqual(r[0].response, prepare('ignore.user.is.ignored', { userName: 'testuser2' }));
      assert(await isIgnored(testuser2));
      assert(typeof item !== 'undefined');
      assert(item.value.includes('testuser2'));
    });

    it('testuser3 should not be in ignore list', async () => {
      const r = await twitch.ignoreCheck({ sender: owner, parameters: 'testuser3' });
      const item = await AppDataSource.getRepository(Settings).findOne({
        where: {
          namespace: '/services/twitch',
          name: 'ignorelist',
        },
      });

      assert.strictEqual(r[0].response, prepare('ignore.user.is.not.ignored', { userName: 'testuser3' }));
      assert(!(await isIgnored(testuser3)));
      assert(typeof item !== 'undefined');
      assert(!item.value.includes('testuser3'));

    });

    it('remove testuser from ignore list', async () => {
      const r = await twitch.ignoreRm({ sender: owner, parameters: 'testuser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { userName: 'testuser' }));
    });

    it('testuser should not be in ignore list', async () => {
      const r = await twitch.ignoreCheck({ sender: owner, parameters: 'testuser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.not.ignored', { userName: 'testuser' }));
      assert(!(await isIgnored(testuser)));
    });

    it('add testuser by id to ignore list', async () => {
      twitch.ignorelist = [ testuser.userId ];
    });

    it('user should be ignored by id', async () => {
      assert(await isIgnored(testuser));
    });
  });
});
