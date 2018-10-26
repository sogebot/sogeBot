/* global describe it before */

if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const variable = require('../../general.js').variable
const message = require('../../general.js').message

// users
const owner = { username: 'soge__' }

const _ = require('lodash')
const assert = require('chai').assert

const tests = {
  'osu.ppy.sh': {
    'should.return.changed': [
      'Lorem Ipsum osu.ppy.sh dolor sit amet'
    ],
    'should.return.same': [
      'Lorem Ipsum http://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh dolor sit amet'
    ]
  },
  '(https?:\\/\\/)?osu.ppy.sh([\\/A-z0-9_]+)?': {
    'should.return.changed': [
      'Lorem Ipsum osu.ppy.sh dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh dolor sit amet',
      'Lorem Ipsum osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum http://osu.ppy.sh/asd dolor sit amet',
      'Lorem Ipsum https://osu.ppy.sh/asd dolor sit amet'
    ],
    'should.return.same': [
    ]
  },
  'testForSongRequest': {
    'should.return.changed': [
      '!songrequest https://youtu.be/HmZYgqBp1gI',
      '!sr https://youtu.be/HmZYgqBp1gI'
    ]
  },
  'test': {
    'should.return.changed': [
      'test', 'a test', 'test a', 'a test a', '?test', 'test?'
    ],
    'should.return.same': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어'
    ]
  },
  '*test': {
    'should.return.changed': [
      'test', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'a test', 'test a'
    ],
    'should.return.same': [
      'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어'
    ]
  },
  'test*': {
    'should.return.changed': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어'
    ],
    'should.return.same': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어'
    ]
  },
  '*test*': {
    'should.return.same': [
      'abc'
    ],
    'should.return.changed': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어'
    ]
  },
  '+test': {
    'should.return.changed': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test'
    ],
    'should.return.same': [
      'test', 'a test', 'test a', 'testa', 'testaa', 'atesta', 'aatestaa', 'test1', '1test1', 'test11', '11test11', 'русскийtestрусский', 'testрусский', '한국어test한국어', 'test한국어'
    ]
  },
  'test+': {
    'should.return.changed': [
      'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어'
    ],
    'should.return.same': [
      'test', 'a test', 'test a', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어'
    ]
  },
  '+test+': {
    'should.return.same': [
      'test', 'abc', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test'
    ],
    'should.return.changed': [
      'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어'
    ]
  },
  '*test+': {
    'should.return.same': [
      'test', 'abc', 'a test', 'test a', 'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test'
    ],
    'should.return.changed': [
      'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어'
    ]
  },
  '+test*': {
    'should.return.same': [
      'test', 'abc', 'a test', 'test a', 'testa', 'testaa', 'test1', 'test11', 'testрусский', 'test한국어'
    ],
    'should.return.changed': [
      'atest', 'aatest', '1test', '11test', 'русскийtest', '한국어test', 'atesta', 'aatestaa', '1test1', '11test11', 'русскийtestрусский', '한국어test한국어'
    ]
  }
}

describe('systems/moderation - whitelist()', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()

    global.systems.alias.add({ sender: owner, parameters: 'viewer !sr !songrequest' })
    await message.isSent('alias.alias-was-added', owner, { alias: '!sr', command: '!songrequest', sender: owner.username })
  })

  for (let [pattern, test] of Object.entries(tests)) {
    for (let text of _.get(test, 'should.return.changed', [])) {
      it(`pattern '${pattern}' should change '${text}'`, async () => {
        await (global.systems.moderation.settings.lists.whitelist = [pattern])
        await variable.isEqual('systems.moderation.settings.lists.whitelist', [pattern])
        let result = await global.systems.moderation.whitelist(text)
        assert.isTrue(text !== result)
      })
    }
    for (let text of _.get(test, 'should.return.same', [])) {
      it(`pattern '${pattern}' should not change '${text}'`, async () => {
        await (global.systems.moderation.settings.lists.whitelist = [pattern])
        await variable.isEqual('systems.moderation.settings.lists.whitelist', [pattern])
        let result = await global.systems.moderation.whitelist(text)
        assert.isTrue(text === result)
      })
    }
  }
})
