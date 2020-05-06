/* eslint-disable @typescript-eslint/no-var-requires */
/* global describe it */
require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const bets = (require('../../../dest/systems/bets')).default;

const assert = require('assert');

// users
const owner = { username: 'soge__' };

describe('Bets - bet open do not give infromation how to use | https://github.com/sogehige/sogeBot/issues/3301', () => {
  let r = [];
  before(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Open new bet without any params', async () => {
    r = await bets.open({ sender: owner, parameters: '' });
  });

  it ('!bet open should have correct error message', async () => {
    assert.strictEqual(r[0].response, '!bet open [-timeout 5] -title "Example string" Value1 | Another value | ...');
  });
});