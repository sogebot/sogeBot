const assert = require('assert');

const { isOwner } = require('../../../dest/helpers/user/isOwner');
require('../../general.js');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('lib/commons - @func2 - isOwner()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  it('should be returned as owner', async () => {
    assert(isOwner(user.owner));
  });

  it('should not be returned as owner', async () => {
    assert(!isOwner(user.viewer));
  });
});
