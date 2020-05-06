/* global describe it before */

const assert = require('assert');
require('../../general.js');

const db = require('../../general.js').db;
const { prepare } = require('../../../dest/commons');
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Settings } = require('../../../dest/database/entity/settings');

const tmi = (require('../../../dest/tmi')).default;

// users
const owner = { username: 'soge__' };
const testuser = { username: 'testuser', userId: '1' };
const testuser2 = { username: 'testuser2', userId: '2' };
const testuser3 = { username: 'testuser3', userId: '3' };
const nightbot = { username: 'nightbot', userId: '4' };
const botwithchangedname = { username: 'asdsadas', userId: '24900234' };

const commons = require('../../../dest/commons');
const { VariableWatcher } = require('../../../dest/watchers');

describe('TMI - ignore', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    tmi.globalIgnoreListExclude = [];
    tmi.ignorelist = [];

    await getRepository(User).save(testuser);
    await getRepository(User).save(testuser2);
    await getRepository(User).save(testuser3);
  });

  beforeEach(async () => {
    await VariableWatcher.check();
  });

  describe('Global ignore workflow', () => {
    it ('nightbot should be ignored by default', async () => {
      assert(await commons.isIgnored(nightbot)); // checked by known_alias
    });

    it ('botwithchangedname should be ignored by default', async () => {
      assert(await commons.isIgnored(botwithchangedname)); // checked by id
    });

    it ('exclude botwithchangedname from ignore list', async () => {
      tmi.globalIgnoreListExclude = [botwithchangedname.userId];
    });

    it ('botwithchangedname should not be ignored anymore', async () => {
      assert(!(await commons.isIgnored(botwithchangedname))); // checked by id
    });
  });

  describe('Ignore workflow', () => {
    it('testuser is not ignored by default', async () => {
      assert(!(await commons.isIgnored(testuser)));
    });

    it('add testuser to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: 'testuser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'testuser' }));
    });

    it('add @testuser2 to ignore list', async () => {
      const r = await tmi.ignoreAdd({ sender: owner, parameters: '@testuser2' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.added', { username: 'testuser2' }));
    });

    it('testuser should be in ignore list', async () => {
      const r = await tmi.ignoreCheck({ sender: owner, parameters: 'testuser' });

      const item = await getRepository(Settings).findOne({
        where: {
          namespace: '/core/tmi',
          name: 'ignorelist',
        },
      });

      assert.strictEqual(r[0].response, prepare('ignore.user.is.ignored', { username: 'testuser' }));
      assert(await commons.isIgnored(testuser));
      assert(typeof item !== 'undefined');
      assert(item.value.includes('testuser'));
    });

    it('@testuser2 should be in ignore list', async () => {
      const r = await tmi.ignoreCheck({ sender: owner, parameters: '@testuser2' });
      const item = await getRepository(Settings).findOne({
        where: {
          namespace: '/core/tmi',
          name: 'ignorelist',
        },
      });

      assert.strictEqual(r[0].response, prepare('ignore.user.is.ignored', { username: 'testuser2' }));
      assert(await commons.isIgnored(testuser2));
      assert(typeof item !== 'undefined');
      assert(item.value.includes('testuser2'));
    });

    it('testuser3 should not be in ignore list', async () => {
      const r = await tmi.ignoreCheck({ sender: owner, parameters: 'testuser3' });
      const item = await getRepository(Settings).findOne({
        where: {
          namespace: '/core/tmi',
          name: 'ignorelist',
        },
      });

      assert.strictEqual(r[0].response, prepare('ignore.user.is.not.ignored', { username: 'testuser3' }));
      assert(!(await commons.isIgnored(testuser3)));
      assert(typeof item !== 'undefined');
      assert(!item.value.includes('testuser3'));

    });

    it('remove testuser from ignore list', async () => {
      const r = await tmi.ignoreRm({ sender: owner, parameters: 'testuser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.removed', { username: 'testuser' }));
    });

    it('testuser should not be in ignore list', async () => {
      const r = await tmi.ignoreCheck({ sender: owner, parameters: 'testuser' });
      assert.strictEqual(r[0].response, prepare('ignore.user.is.not.ignored', { username: 'testuser' }));
      assert(!(await commons.isIgnored(testuser)));
    });

    it('add testuser by id to ignore list', async () => {
      tmi.ignorelist = [ testuser.userId ];
    });

    it('user should be ignored by id', async () => {
      assert(await commons.isIgnored(testuser));
    });
  });
});
