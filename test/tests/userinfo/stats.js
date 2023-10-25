/* global describe it beforeEach */

import('../../general.js');

import { db, message, user } from '../../general.js';

import assert from 'assert';
import userinfo from '../../../dest/systems/userinfo.js'

describe('Userinfo - stats() - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  const hours = '0';
  const points = '0';
  const messages = '0';
  const tips = '0.00';
  const bits = '0';
  const level = '0';

  it('!stats testuser should show testuser data', async () => {
    const r = await userinfo.showStats({ parameters: user.viewer.userName, sender: user.owner });
    assert.strictEqual(r[0].response, `$touser | Level ${level} | ${hours} hours | ${points} points | ${messages} messages | €${tips} | ${bits} bits | 0 months`, user.owner, 1000);
  });

  it('!stats should show owner data', async () => {
    const r = await userinfo.showStats({ parameters: '', sender: user.owner });
    assert.strictEqual(r[0].response, `$sender | Level ${level} | ${hours} hours | ${points} points | ${messages} messages | €${tips} | ${bits} bits | 0 months`, user.owner, 1000);
  });
});
