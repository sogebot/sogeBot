const assert = require('assert');

const constants = require('@sogebot/ui-helpers/constants');
const { dayjs } = require('@sogebot/ui-helpers/dayjsHelper');

const { User } = require('../../../dest/database/entity/user');
const { getOwner } = require('../../../dest/helpers/commons/getOwner');
const { prepare } = require('../../../dest/helpers/commons/prepare');
const {
  serialize,
} = require('../../../dest/helpers/type');
const { AppDataSource } = require('../../../dest/database');
const twitch = require('../../../dest/services/twitch').default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;

require('../../general.js');

// users
const owner = { userName: '__broadcaster__' };

let top;

describe('Top - !top level - @func1', () => {
  before(async () => {
    top = (require('../../../dest/systems/top')).default;
    await db.cleanup();
    await message.prepare();
  });

  it ('Add 10 users into db and last user will don\'t have any xp', async () => {
    for (let i = 0; i < 10; i++) {
      await AppDataSource.getRepository(User).save({
        userId:   String(Math.floor(Math.random() * 100000)),
        userName: 'user' + i,
        extra:    { levels: { xp: serialize(BigInt(i * 1234)) } },
      });
    }
  });

  it('run !top level and expect correct output', async () => {
    const r = await top.level({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, `Top 10 (level): 1. @user9 - 6 (11106XP), 2. @user8 - 6 (9872XP), 3. @user7 - 5 (8638XP), 4. @user6 - 5 (7404XP), 5. @user5 - 5 (6170XP), 6. @user4 - 5 (4936XP), 7. @user3 - 4 (3702XP), 8. @user2 - 4 (2468XP), 9. @user1 - 3 (1234XP), 10. @user0 - 0 (0XP)`, owner);
  });

  it('add user9 to ignore list', async () => {
    const r = await twitch.ignoreAdd({ sender: owner, parameters: 'user9' });
    assert.strictEqual(r[0].response, prepare('ignore.user.is.added' , { userName: 'user9' }));
  });

  it('run !top level and expect correct output', async () => {
    const r = await top.level({ sender: { userName: getOwner() } });
    assert.strictEqual(r[0].response, `Top 10 (level): 1. @user8 - 6 (9872XP), 2. @user7 - 5 (8638XP), 3. @user6 - 5 (7404XP), 4. @user5 - 5 (6170XP), 5. @user4 - 5 (4936XP), 6. @user3 - 4 (3702XP), 7. @user2 - 4 (2468XP), 8. @user1 - 3 (1234XP), 9. @user0 - 0 (0XP)`, owner);
  });
});
