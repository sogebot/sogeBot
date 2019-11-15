/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */


const uuidv4 = require('uuid/v4');

require('../../general.js');
const log = require('../../../dest/helpers/log');

const assert = require('assert');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;

const { getRepository } = require('typeorm');
const { User } = require('../../../dest/database/entity/user');
const { Event } = require('../../../dest/database/entity/event');

describe('Events - tip event', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  describe('#2219 - Give points on tip not working', function () {
    before(async function () {
      const event = new Event();
      event.id = uuidv4();
      event.name = 'tip';
      event.givenName = 'Tip alert';
      event.triggered = {};
      event.definitions = {};
      event.filter = '';
      event.isEnabled = true;
      event.operations = [{
        name: 'run-command',
        definitions: {
          isCommandQuiet: true,
          commandToRun: '!points add $username (math.$amount*10)',
        },
      }];
      await getRepository(Event).save(event);

      for (const user of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
        await getRepository(User).save({ username: user, userId: Math.floor(Math.random() * 100000) });
      }
    });

    for (const username of ['losslezos', 'rigneir', 'mikasa_hraje', 'foufhs']) {
      describe(username + ' tip event', () => {
        it('trigger tip event for 10 EUR - ' + username, async () => {
          log.tip(`${username}, amount: 10.00EUR, message: Ahoj jak je`);
          global.events.fire('tip', { userId: Math.floor(Math.random * 100000), username: username, amount: 10.00, message: 'Ahoj jak je', currency: 'EUR' });
        });

        it('wait 1s', async () => {
          await time.waitMs(1000);
        });

        it('we are not expecting any messages to be sent - quiet mode', async () => {
          assert.strict.equal(log.chatOut.callCount, 0);
        });

        it('user should have 100 points', async () => {
          const user = await getRepository(User).findOne({ username });
          assert.strict.equal(user.points, 100);
        });
      });
    }
  });
});
