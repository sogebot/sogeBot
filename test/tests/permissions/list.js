import('../../general.js');

import assert from 'assert';

import { prepare } from '../../../dest/helpers/commons/prepare.js';
import permissions from '../../../dest/permissions.js'
import { db } from '../../general.js';
import { message } from '../../general.js';

// users
const owner = { userName: '__broadcaster__' };

describe('Permissions - list() - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();
  });

  it('Permission list should be correct', async () => {
    const r = await permissions.list({ sender: owner, parameters: '' });
    assert.strictEqual(r[0].response, prepare('core.permissions.list'));
    assert.strictEqual(r[1].response, '≥ | Casters | 4300ed23-dca0-4ed9-8014-f5f2f7af55a9', owner);
    assert.strictEqual(r[2].response, '≥ | Moderators | b38c5adb-e912-47e3-937a-89fabd12393a', owner);
    assert.strictEqual(r[3].response, '≥ | Subscribers | e3b557e7-c26a-433c-a183-e56c11003ab7', owner);
    assert.strictEqual(r[4].response, '≥ | VIP | e8490e6e-81ea-400a-b93f-57f55aad8e31', owner);
    assert.strictEqual(r[5].response, '≥ | Viewers | 0efd7b1c-e460-4167-8e06-8aaf2c170311', owner);
  });
});
