/* global describe it before */


const uuidv4 = require('uuid/v4');

const log = require('../../../dest/helpers/log');
require('../../general.js');

const assert = require('assert');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const _ = require('lodash');

const tmi = (require('../../../dest/tmi')).default;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Event } = require('../../../dest/database/entity/event');

describe('Events - cheer event', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('#1699 - Cheer event is not waiting for user to save id', function () {
    before(async function () {
      const event = new Event();
      event.id = uuidv4();
      event.name = 'cheer';
      event.givenName = 'Cheer alert';
      event.triggered = {};
      event.definitions = {};
      event.filter = '';
      event.isEnabled = true;
      event.operations = [{
        name: 'run-command',
        definitions: {
          isCommandQuiet: true,
          commandToRun: '!points add $username (math.$bits*10)',
        },
      }];
      await getRepository(Event).save(event);

    });

    for (const username of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
      const userId = Math.floor(Math.random() * 10000);
      describe(username + ' cheer event', () => {
        it('trigger cheer event for 1 bit - ' + username, async () => {
          await tmi.cheer({
            tags: {
              username,
              userId,
              bits: 1,
            },
            message: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5),
          });
        });

        it('wait 1s', async () => {
          await time.waitMs(1000);
        });

        it('we are not expecting any messages to be sent - quiet mode', async () => {
          assert.strict.equal(log.chatOut.callCount, 0);
        });

        it('user should have 10 points', async () => {
          const user = await getRepository(User).findOne({ userId });
          assert.strict.equal(user.points, 10);
        });
      });
    }
  });
});
