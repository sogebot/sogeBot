/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const tmi = (require('../../../dest/chat')).default;
const assert = require('assert');

const { sendMessage } = require('../../../dest/helpers/commons/sendMessage');
const { getOwnerAsSender } = require('../../../dest/helpers/commons/getOwnerAsSender');

describe('lib/commons - @func2 - sendMessage()', () => {
  describe('remove /me when in color mode', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('enable color-mode', async () => {
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

    it('enable normal-mode', async () => {
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
