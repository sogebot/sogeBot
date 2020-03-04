/* global describe it beforeEach */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

const userinfo = (require('../../../dest/systems/userinfo')).default;

describe('Userinfo - stats()', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  const hours = '0.0';
  const points = '0';
  const messages = '0';
  const tips = '0.00';
  const bits = '0';

  it('!stats testuser should show testuser data', async () => {
    await userinfo.showStats({ parameters: user.viewer.username, sender: user.owner });
    await message.isSentRaw(`@${user.viewer.username} | ${hours}h | ${points} points | ${messages} messages | ${tips}€ | ${bits} bits`, user.owner, 1000);
  });

  it('!stats should show owner data', async () => {
    await userinfo.showStats({ parameters: '', sender: user.owner });
    await message.isSentRaw(`@${user.owner.username} | ${hours}h | ${points} points | ${messages} messages | ${tips}€ | ${bits} bits`, user.owner, 1000);
  });
});
