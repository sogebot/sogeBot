import assert from 'assert';

const { isOwner } = require('../../../dest/helpers/user/isOwner');
require('../../general.js');
import { db } from '../../general.js';
import { message } from '../../general.js';
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
