/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const bets = (require('../../../dest/systems/bets')).default;

// users
const owner = { username: 'soge__' };

describe('Bets - bet open do not give infromation how to use | https://github.com/sogehige/sogeBot/issues/3301', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Open new bet without any params', async () => {
    await bets.open({ sender: owner, parameters: '' });
  });

  it ('!bet open should have correct error message', async () => {
    await message.isSentRaw('!bet open [-timeout 5] -title "Example string" Value1 | Another value | ...', owner);
  });
});