/* global */

import assert from 'assert';

import('../../general.js');
import { getOwnerAsSender } from '../../../dest/helpers/commons/getOwnerAsSender.js';
import { sendMessage } from '../../../dest/helpers/commons/sendMessage.js';
import emitter from '../../../dest/helpers/interfaceEmitter.js';
import { db } from '../../general.js';
import { message } from '../../general.js';

describe('lib/commons - @func2 - sendMessage()', () => {
  describe('remove /me when in color mode', () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
    });

    it('enable color-mode', async () => {
      emitter.emit('set', '/services/twitch', 'sendWithMe', true);
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
      emitter.emit('set', '/services/twitch', 'sendWithMe', false);
    });

    it('send message containing /me', () => {
      sendMessage('/me lorem ipsum', getOwnerAsSender());
    });

    it('message is sent with /me', async () => {
      await message.isSentRaw('/me lorem ipsum', getOwnerAsSender());
    });
  });

});
