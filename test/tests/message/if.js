/* global describe it beforeEach */
import('../../general.js');

import { db, message as msg } from '../../general.js';
import {Message} from '../../../dest/message.js';
import assert from 'assert';

describe('Message - if filter - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await msg.prepare();
  });

  describe('(if \'$!param\'==\'n/a\'| $sender (random.online.viewer) chosed | $sender and $param (random.number-1-to-100)%)', () => {
    const toParse = '(if \'$!param\'==\'n/a\'| $sender (random.online.viewer) chosed | $sender and $param (random.number-1-to-100)%)';

    it('Check true condition', async () => {
      const message = await new Message(toParse).parse({ param: 'n/a' });
      assert(message === '$sender unknown chosed');
    });
    it('Check false condition', async () => {
      const message = await new Message(toParse).parse({ param: 'asd' });
      assert(message.match(/\$sender and asd \d{1,3}%/).length > 0);
    });
  });
});
