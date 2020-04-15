/* global describe it beforeEach */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const assert = require('assert');
const { prepare } = require('../../../dest/commons');

const permissions = (require('../../../dest/permissions')).default;

// users
const owner = { username: 'soge__' };

describe('Permissions - list()', () => {
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
    assert.strictEqual(r[5].response, '≥ | Followers | c168a63b-aded-4a90-978f-ed357e95b0d2', owner);
    assert.strictEqual(r[6].response, '≥ | Viewers | 0efd7b1c-e460-4167-8e06-8aaf2c170311', owner);
  });
});
