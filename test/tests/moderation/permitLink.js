/* global describe it before */
const commons = require('../../../dest/commons');


require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const assert = require('chai').assert;

const owner = Object.freeze({ username: 'soge__', badges: {} });

describe('systems/moderation - permitLink()', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });
  describe('!permit', function () {
    describe('parsing \'!permit\'', function () {
      it('should send parse error', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: '' });
        await message.isSent('moderation.permit-parse-failed', owner);
      });
    });
    describe('parsing \'!permit [username] 1000\'', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: '__viewer__ 1000' });
        await message.isSent('moderation.user-have-link-permit', owner, { username: '__viewer__', count: 1000, link: commons.getLocalizedName(1000, 'core.links') });
      });
      it('should not timeout user 1000 messages', async () => {
        for (let i = 0; i < 1000; i++) {
          assert.isTrue(await global.systems.moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
        }
      });
      it('should timeout user on 1001 message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
      });
    });
    describe('parsing \'!permit [username]\'', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: '__viewer__' });
        await message.isSent('moderation.user-have-link-permit', owner, { username: '__viewer__', count: 1, link: 'link' });
      });
      it('should not timeout user on first link message', async () => {
        assert.isTrue(await global.systems.moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
      });
      it('should timeout user on second link message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
      });
    });
    describe('parsing \'!permit [username]\' - case sensitive test', function () {
      it('should send success message', async function () {
        global.systems.moderation.permitLink({ sender: owner, parameters: '__VIEWER__' });
        await message.isSent('moderation.user-have-link-permit', owner, { username: '__viewer__', count: 1, link: 'link' });
      });
      it('should not timeout user on first link message', async () => {
        assert.isTrue(await global.systems.moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
      });
      it('should timeout user on second link message', async function () {
        assert.isFalse(await global.systems.moderation.containsLink({ sender: user.viewer, message: 'http://www.google.com' }));
      });
    });
  });
});
