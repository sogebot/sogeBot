/* global */
import('../../general.js');
import('../../mocks.js');

import assert from 'assert';

import {Message} from '../../../dest/message.js';
import { db, message as msg } from '../../general.js';

describe('Message - api filter - @func3', () => {
  beforeEach(async () => {
    await db.cleanup();
    await msg.prepare();
  });

  describe('#1989 - ?test=a\\\\nb should be correctly parsed', () => {
    // we are using mock http://localhost/get?test=a\\nb

    const toParse = '(api|http://localhost/get?test=a\\nb) Lorem (api.test)';

    it('Expecting response Lorem a\\\\nb', async () => {
      const message = await new Message(toParse).parse({ });
      assert(message === 'Lorem a\\nb');
    });
  });
});
