/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const variable = require('../../general.js').variable;


const oauth = (require('../../../dest/oauth')).default;

const { isOwner } = require('../../../dest/helpers/user/isOwner');

const assert = require('assert');

const owner = { username: '__broadcaster__' };
const notOwner = { username: 'testuser' };

describe('lib/commons - @func2 - isOwner()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();

    oauth.generalOwners = ['__broadcaster__'];
  });

  it('should be returned as owner', async () => {
    assert(isOwner(owner));
  });

  it('should not be returned as owner', async () => {
    assert(!isOwner(notOwner));
  });
});
