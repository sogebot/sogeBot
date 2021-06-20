/* global describe it before */

const _ = require('lodash');
const { getRepository } = require('typeorm');
const { v4: uuidv4 } = require('uuid');

require('../../general.js');

const { Commands } = require('../../../dest/database/entity/commands');
const { Event } = require('../../../dest/database/entity/event');
const { User } = require('../../../dest/database/entity/user');
const events = (require('../../../dest/events')).default;
const { defaultPermissions } = (require('../../../dest/helpers/permissions/'));
const { isBotSubscriber } = require('../../../dest/helpers/user/isBot');
const alias = (require('../../../dest/systems/alias')).default;
const commercial = (require('../../../dest/systems/commercial')).default;
const customcommands = (require('../../../dest/systems/customcommands')).default;
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const time = require('../../general.js').time;
const user = require('../../general.js').user;

let event;
describe('Events - event run command should correctly parse filters and be able to use CASTERS permissions - https://discord.com/channels/317348946144002050/619437014001123338/8157333500391587958', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    event = {};
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
        commandToRun:   '!test33',
        isCommandQuiet: false,
      },
    }];
    await getRepository(Event).save(event);

    const command = await getRepository(Commands).save({
      command:   '!test33',
      enabled:   true,
      visible:   true,
      responses: [
        {
          order:          0,
          response:       '1',
          permission:     defaultPermissions.CASTERS,
          stopIfExecuted: true,
          filter:         '$isBotSubscriber',
        },
        {
          order:          1,
          response:       '2',
          permission:     defaultPermissions.MODERATORS,
          stopIfExecuted: true,
          filter:         `$sender === '${user.viewer2.username}'`,
        },
        {
          order:          2,
          response:       '3',
          permission:     defaultPermissions.VIEWERS,
          stopIfExecuted: true,
          filter:         '',
        },
      ],
    });
    customcommands.invalidateCache();
  });

  it('set bot as subscriber', async () => {
    await message.prepare();
    isBotSubscriber(true);
  });

  it('trigger follow event', async () => {
    await events.fire('follow', { username: user.viewer.username, userId: user.viewer.userId });
  });

  it('commands should be triggered', async () => {
    await message.isSentRaw(`1`, user.viewer);
  });

  it('unset bot as subscriber', async () => {
    await message.prepare();
    isBotSubscriber(false);
  });

  it('trigger follow event', async () => {
    await events.fire('follow', { username: user.viewer2.username, userId: user.viewer2.userId });
  });

  it('commands should be triggered', async () => {
    await message.isSentRaw(`2`, user.viewer2);
  });

  it('trigger follow event', async () => {
    await events.fire('follow', { username: user.viewer3.username, userId: user.viewer3.userId });
  });

  it('commands should be triggered', async () => {
    await message.isSentRaw(`3`, user.viewer3);
  });

  it('set bot as subscriber', async () => {
    await message.prepare();
    isBotSubscriber(true);
  });
});
