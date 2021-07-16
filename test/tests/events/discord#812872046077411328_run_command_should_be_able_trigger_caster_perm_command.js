/* global describe it before */

const _ = require('lodash');
const { getRepository } = require('typeorm');
const { v4: uuidv4 } = require('uuid');

require('../../general.js');

const { Event } = require('../../../dest/database/entity/event');
const { User } = require('../../../dest/database/entity/user');
const events = (require('../../../dest/events')).default;
const defaultPermissions = (require('../../../dest/helpers/permissions/defaultPermissions')).defaultPermissions;
const alias = (require('../../../dest/systems/alias')).default;
const commercial = (require('../../../dest/systems/commercial')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

describe('Events - event run command should be able to run caster command and alias - https://discord.com/channels/317348946144002050/317349069024395264/812872046077411328', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    commercial.setCommand('!commercial', '!test');

    const event = {};
    event.id = uuidv4();
    event.name = 'follow';
    event.givenName = 'Follow alert';
    event.triggered = {};
    event.definitions = {};
    event.filter = '';
    event.isEnabled = true;
    event.operations = [{
      name:        'run-command',
      definitions: {
        commandToRun:   '!test',
        isCommandQuiet: false,
      },
    }, {
      name:        'run-command',
      definitions: {
        commandToRun:   '!test2',
        isCommandQuiet: false,
      },
    }];
    const a = await alias.add({ sender: user.owner, parameters: '-a !test2 -c !command -p ' + defaultPermissions.CASTERS });
    await getRepository(Event).save(event);
  });

  after(() => {
    commercial.setCommand('!commercial', '!commercial');
  });

  for (const follower of [user.viewer, user.viewer2, user.viewer3]) {
    it ('reset message', async () => {
      await message.prepare();
    });
    it('trigger follow event', async () => {
      await events.fire('follow', { username: follower.username, userId: follower.userId });
    });

    it('command should be triggered', async () => {
      await message.isSentRaw(`Usage: !test [duration] [optional-message]`, follower);
    });

    it('alias should be triggered', async () => {
      await message.isSentRaw(`Usage => http://sogehige.github.io/sogeBot/#/_master/systems/custom-commands`, follower);
    });

    it('wait 5s', async () => {
      await time.waitMs(5000);
    });
  }
});
