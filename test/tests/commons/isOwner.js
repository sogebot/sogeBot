/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const variable = require('../../general.js').variable;


const oauth = (require('../../../dest/oauth')).default;

const { isOwner } = require('../../../dest/commons');

const assert = require('assert');

const owner = { username: 'soge__' };
const notOwner = { username: 'testuser' };

describe('lib/commons - isOwner()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    oauth.generalOwners = ['soge__'];
  });

  it('should be returned as owner', async () => {
    assert(isOwner(owner));
  });

  it('should not be returned as owner', async () => {
    assert(!isOwner(notOwner));
  });
});
