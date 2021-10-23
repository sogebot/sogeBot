/* global */

const assert = require('assert');
require('../../general.js');

const { getRepository } = require('typeorm');

const { User } = require('../../../dest/database/entity/user');
const users = (require('../../../dest/users')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

// users
const testuser = { userName: 'testuser', userId: '1' };
const testuser2 = { userName: 'testuser2', userId: '2' };
const testuser3 = { userName: 'testuser3', userId: '3' };
const nightbot = { userName: 'nightbot', userId: '4' };

let translatedIds;

describe('User - getUsernamesFromIds - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    await getRepository(User).save(testuser);
    await getRepository(User).save(testuser2);
    await getRepository(User).save(testuser3);
    await getRepository(User).save(nightbot);
  });

  describe('getUsernamesFromIds should get correct usernames', () => {
    it('ask for 4 ids + 1 duplication', async () => {
      translatedIds = await users.getUsernamesFromIds(['1','2','3','4','1']);
    });

    it('expecting 4 values', async () => {
      assert.strictEqual(translatedIds.size, 4);
    });

    for (const user of [testuser, testuser2, testuser3, nightbot]) {
      it(`Expecting id ${user.userId} have correct username ${user.userName}`, () => {
        assert.strictEqual(translatedIds.get(user.userId), user.userName);
      });
    }
  });
});
