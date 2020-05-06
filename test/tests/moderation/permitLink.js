/* global describe it before */
const commons = require('../../../dest/commons');

const moderation = (require('../../../dest/systems/moderation')).default;

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const assert = require('assert');

const owner = Object.freeze({ username: 'soge__', badges: {}, userId: 12345 });

describe('systems/moderation - permitLink()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });
  describe('!permit', function () {
    describe('parsing \'!permit\'', function () {
      it('should send parse error', async function () {
        const r = await moderation.permitLink({ sender: owner, parameters: '' });
        assert.strictEqual(r[0].response, 'Sorry, $sender, but this command is not correct, use !permit [username]');
      });
    });
    describe('parsing \'!permit [username] 100\'', function () {
      it('should send success message', async function () {
        const r = await moderation.permitLink({ sender: owner, parameters: '__viewer__ 100' });
        assert.strictEqual(r[0].response, 'User @__viewer__ can post a 100 links to chat');
      });
      it('should not timeout user 100 messages', async () => {
        for (let i = 0; i < 100; i++) {
          assert(await moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
        }
      });
      it('should timeout user on 1001 message', async function () {
        assert(!(await moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' })));
      });
    });
    describe('parsing \'!permit [username]\'', function () {
      it('should send success message', async function () {
        const r = await moderation.permitLink({ sender: owner, parameters: '__viewer__' });
        assert.strictEqual(r[0].response, 'User @__viewer__ can post a 1 link to chat');
      });
      it('should not timeout user on first link message', async () => {
        assert(await moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
      });
      it('should timeout user on second link message', async function () {
        assert(!(await moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' })));
      });
    });
    describe('parsing \'!permit [username]\' - case sensitive test', function () {
      it('should send success message', async function () {
        const r = await moderation.permitLink({ sender: owner, parameters: '__VIEWER__' });
        assert.strictEqual(r[0].response, 'User @__viewer__ can post a 1 link to chat');
      });
      it('should not timeout user on first link message', async () => {
        assert(await moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
      });
      it('should timeout user on second link message', async function () {
        assert(!(await moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' })));
      });
    });
  });
});
