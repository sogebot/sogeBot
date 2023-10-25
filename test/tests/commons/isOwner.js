import assert from 'assert';

import { isOwner } from '../../../dest/helpers/user/isOwner.js';
import('../../general.js');
import { db, message, user } from '../../general.js';

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
