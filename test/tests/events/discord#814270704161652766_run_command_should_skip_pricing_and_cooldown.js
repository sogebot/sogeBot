/* global describe it before */

const assert = require('assert');

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
const cooldown = (require('../../../dest/systems/cooldown')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

describe('Events - event run command should be able to skip pricing and cooldown - https://discord.com/channels/317348946144002050/619437014001123338/814270704161652766', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

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
    }];
    await getRepository(Event).save(event);
    await alias.add({ sender: user.owner, parameters: '-a !test -c !commercial -p ' + defaultPermissions.CASTERS });

    const r = await cooldown.main({ sender: user.owner, parameters: '!test global 20 true' });
    assert.strictEqual(r[0].response, '$sender, global cooldown for !test was set to 20s');
  });

  for (const follower of [user.viewer, user.viewer2, user.viewer3]) {
    it ('reset message', async () => {
      await message.prepare();
    });
    it('trigger follow event', async () => {
      await events.fire('follow', { username: follower.username, userId: follower.userId });
    });

    it('parsers should be skipped', async () => {
      await message.debug('parser.process', 'Skipped Cooldown.check (fireAndForget: false)');
      await message.debug('parser.process', 'Skipped Price.check (fireAndForget: false)');
      await message.debug('parser.process', 'Skipped Points.messagePoints (fireAndForget: true)');
    });

    it('command should be triggered', async () => {
      await message.isSentRaw(`Usage: !commercial [duration] [optional-message]`, follower);
    });
  }
});
