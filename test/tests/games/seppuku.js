/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it before */

require('../../general.js');
const assert = require('assert');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const seppuku = (require('../../../dest/games/seppuku')).default;

describe('game/seppuku - !seppuku - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('Normal user', async () => {
    const responses = await seppuku.main({ sender: user.viewer, parameters: '' });
    assert(responses[0].response === '$sender has committed seppuku.', JSON.stringify({responses}));
  });

  it('Broadcaster user', async () => {
    const responses = await seppuku.main({ sender: user.owner, parameters: '' });
    assert(responses[0].response === '$sender tried to commit seppuku, but lost a sword.', JSON.stringify({responses}));
  });

  it('Mod user', async () => {
    const responses = await seppuku.main({ sender: user.mod, parameters: '' });
    assert(responses[0].response === '$sender tried to commit seppuku, but broke a sword.', JSON.stringify({responses}));
  });
});
