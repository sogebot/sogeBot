const assert = require('assert');

require('../../general.js');

const { getRepository } = require('typeorm');
const { v4: uuidv4 } = require('uuid');

const { Event } = require('../../../dest/database/entity/event');
const { User } = require('../../../dest/database/entity/user');
const log = require('../../../dest/helpers/log');
const changelog = (require('../../../dest/helpers/user/changelog'));
const time = require('../../general.js').time;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('Events - cheer event - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  describe('#1699 - Cheer event is not waiting for user to save id', function () {
    before(async function () {
      await getRepository(Event).save({
        id:          uuidv4(),
        name:        'cheer',
        givenName:   'Cheer alert',
        triggered:   {},
        definitions: {},
        filter:      '',
        isEnabled:   true,
        operations:  [{
          name:        'run-command',
          definitions: {
            isCommandQuiet: true,
            commandToRun:   '!points add $username (math.$bits*10)',
          },
        }],
      });
    });

    for (const username of [user.viewer.userName, user.viewer2.userName, user.mod.userName, user.owner.userName]) {
      const userId = String(Math.floor(Math.random() * 10000));
      describe(username + ' cheer event', () => {
        it('trigger cheer event for 1 bit - ' + username, async () => {
          const TMI = require('../../../dest/services/twitch/chat').default;
          const tmi = new TMI();
          await tmi.cheer({
            userName: username,
            userId:   userId,
          },
          Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5),
          1,
          );
        });

        it('wait 1s', async () => {
          await time.waitMs(1000);
        });

        it('we are not expecting any messages to be sent - quiet mode', async () => {
          assert.strict.equal(log.chatOut.callCount, 0);
        });

        it('user should have 10 points', async () => {
          await changelog.flush();
          const userDb = await getRepository(User).findOne({ userId });
          assert.strict.equal(userDb.points, 10);
        });
      });
    }
  });
});
