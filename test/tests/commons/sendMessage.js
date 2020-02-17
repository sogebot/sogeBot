/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const tmi = (require('../../../dest/tmi')).default;
const assert = require('chai').assert;

const { sendMessage, getOwnerAsSender } = require('../../../dest/commons');

describe('lib/commons - sendMessage()', () => {
  describe('remove /me when in color mode', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('enable color-mode', () => {
      tmi.sendWithMe = true;
    });

    it('send message containing /me', () => {
      sendMessage('/me lorem ipsum', getOwnerAsSender());
    });

    it('message is sent without /me', async () => {
      await message.isSentRaw('lorem ipsum', getOwnerAsSender());
    });
  });

  describe('keep /me when in normal mode', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('enable normal-mode', () => {
      tmi.sendWithMe = false;
    });

    it('send message containing /me', () => {
      sendMessage('/me lorem ipsum', getOwnerAsSender());
    });

    it('message is sent with /me', async () => {
      await message.isSentRaw('/me lorem ipsum', getOwnerAsSender());
    });
  });

});
