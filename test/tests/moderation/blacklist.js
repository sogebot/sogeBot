/* global describe it before */


import('../../general.js');

import { db } from '../../general.js';
import { variable } from '../../general.js';
import { message } from '../../general.js';
import { user } from '../../general.js';

import _ from 'lodash-es';
import assert from 'assert';
import moderation from '../../../dest/systems/moderation.js';

const tests = {
  'test': {
    'should.return.false': [
      'test', 'a test', 'test a', 'a test a', 'test?', '?test',
    ],
    'should.return.true': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어',
    ],
  },
  '*test': {
    'should.return.false': [
      'test', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'a test', 'test a', 'test?', '?test',
    ],
    'should.return.true': [
      'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어',
    ],
  },
  'test*': {
    'should.return.false': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'test?', '?test',
    ],
    'should.return.true': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
  },
  '*test*': {
    'should.return.true': [
      'abc',
    ],
    'should.return.false': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어', 'test?', '?test',
    ],
  },
  '+test': {
    'should.return.false': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atest?',
    ],
    'should.return.true': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어', '?test',
    ],
  },
  'test+': {
    'should.return.false': [
      'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', '?testa',
    ],
    'should.return.true': [
      'test', 'a test', 'test a', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어', 'test?',
    ],
  },
  '+test+': {
    'should.return.false': [
      'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
    'should.return.true': [
      'test', 'abc', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'test?', '?test',
    ],
  },
  '*test+': {
    'should.return.false': [
      'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
    'should.return.true': [
      'test', 'abc', 'a test', 'test a', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'test?', '?test',
    ],
  },
  '+test*': {
    'should.return.false': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어',
    ],
    'should.return.true': [
      'test', 'abc', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'test?', '?test',
    ],
  },
  '*саня*': {
    'should.return.false': ['саня'],
    'should.return.true': [],
  },
  ' ': {
    'should.return.false': [],
    'should.return.true': ['have a good night brotha'],
  },
};

describe('systems/moderation - blacklist() - @func1', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
  });

  for (const [pattern, test] of Object.entries(tests)) {
    for (const text of _.get(test, 'should.return.true', [])) {
      it(`pattern '${pattern}' should ignore '${text}'`, async () => {
        moderation.cListsBlacklist = [pattern];
        const result = await moderation.blacklist({ sender: user.viewer, message: text });
        assert(result);
      });
    }
    for (const text of _.get(test, 'should.return.false', [])) {
      it(`pattern '${pattern}' should timeout on '${text}'`, async () => {
        moderation.cListsBlacklist = [pattern];
        const result = await moderation.blacklist({ sender: user.viewer, message: text });
        assert(!result);
      });
    }
  }
});
