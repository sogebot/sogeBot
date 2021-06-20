/* global describe it before */

const _ = require('lodash');
const { getRepository } = require('typeorm');
const { v4: uuidv4 } = require('uuid');

require('../../general.js');

const { Event } = require('../../../dest/database/entity/event');
const { User } = require('../../../dest/database/entity/user');
const events = (require('../../../dest/events')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

describe('Events - follow event', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  describe('#1370 - Second follow event didn\'t trigger event ', function () {
    before(async function () {
      const event = {};
      event.id = uuidv4();
      event.name = 'follow';
      event.givenName = 'Follow alert';
      event.triggered = {};
      event.definitions = {};
      event.filter = '';
      event.isEnabled = true;
      event.operations = [{
        name:        'emote-explosion',
        definitions: { emotesToExplode: 'purpleHeart <3' },
      }, {
        name:        'run-command',
        definitions: {
          commandToRun:   '!duel',
          isCommandQuiet: true,
        },
      }, {
        name:        'send-chat-message',
        definitions: { messageToSend: 'Diky za follow, $username!' },
      }];
      await getRepository(Event).save(event);
    });

    for (const follower of [user.viewer, user.viewer2, user.viewer3]) {
      it('trigger follow event', async () => {
        await events.fire('follow', { username: follower.username, userId: follower.userId });
      });

      it('message should be send', async () => {
        await message.isSentRaw(`Diky za follow, @${follower.username}!`, { username: follower.username });
      });

      it('wait 5s', async () => {
        await time.waitMs(5000);
      });
    }
  });
});
