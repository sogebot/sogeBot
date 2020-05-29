/* global describe it before */

const assert = require('assert');
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');

const users = (require('../../../dest/users')).default;

// users
const testuser = { username: 'testuser', userId: 1 };
const testuser2 = { username: 'testuser2', userId: 2 };
const testuser3 = { username: 'testuser3', userId: 3 };
const nightbot = { username: 'nightbot', userId: 4 };

describe('User - getUsernamesFromIds', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save(testuser);
    await getRepository(User).save(testuser2);
    await getRepository(User).save(testuser3);
    await getRepository(User).save(nightbot);
  });

  describe('getUsernamesFromIds should get correct usernames', () => {
    let translatedIds: any[] = [];
    it('ask for 4 ids + 1 duplication', async () => {
      translatedIds = await users.getUsernamesFromIds([1,2,3,4,1]);
    });

    it('expecting 4 values', async () => {
      assert.strictEqual(translatedIds.length, 4);
    });

    for (const user of [testuser, testuser2, testuser3, nightbot]) {
      it(`Expecting id ${user.userId} have correct username ${user.username}`, () => {
        assert.strictEqual(translatedIds.find(o => o.id === user.userId).username, user.username);
      });
    }
  });
});
