/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const db = require('../../general.js').db
const variable = require('../../general.js').variable
const message = require('../../general.js').message
const assert = require('chai').assert

const tests = {
  'clips': [
    'clips.twitch.tv/TolerantExquisiteDuckOneHand'
  ],
  'links': [ // tests will test links, http://links, https://links
    'google.me',
    'google.shop',
    'google.com',
    'google.COM',
    'GOOGLE.com',
    'GOOGLE.COM',
    'google .com',
    'google .COM',
    'GOOGLE .com',
    'GOOGLE .COM',
    'google . com',
    'google . COM',
    'GOOGLE . com',
    'GOOGLE . COM',
    'google . com',
    'www.google.com',
    'www.google.COM',
    'www.GOOGLE.com',
    'www.GOOGLE.COM',
    'WWW.GOOGLE.COM',
    'www.google .com',
    'www.google .COM',
    'www.GOOGLE .com',
    'www.GOOGLE .COM',
    'WWW.GOOGLE .COM',
    'www.google . com',
    'www.google . COM',
    'www.GOOGLE . com',
    'www.GOOGLE . COM',
    'WWW.GOOGLE . COM',
    'www. google.com',
    'www. google.COM',
    'www. GOOGLE.com',
    'www. GOOGLE.COM',
    'WWW. GOOGLE.COM',
    'youtu.be/123jAJD123'
  ],
  'texts': [
    '#42 - proc hrajes tohle auto je dost na nic ....',
    '#44 - 1.2.3.4',
    '#47 - vypadá že máš problémy nad touto počítačovou hrou....doporučuji tvrdý alkohol'
  ]
}

describe('systems/moderation - containsLink()', () => {
  describe('moderationLinksClips=true & moderationLinksWithSpaces=true', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.systems.moderation.cLinksIncludeSpaces = true
      await variable.isEqual('systems.moderation.cLinksIncludeSpaces', true)
      global.systems.moderation.cLinksIncludeClips = true
      await variable.isEqual('systems.moderation.cLinksIncludeClips', true)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'clips') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`clip '${protocol}${test}' should timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: test }))
          })
        }
      }
    }
  })
  describe('moderationLinksClips=false & moderationLinksWithSpaces=true', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.systems.moderation.cLinksIncludeSpaces = true
      await variable.isEqual('systems.moderation.cLinksIncludeSpaces', true)
      global.systems.moderation.cLinksIncludeClips = false
      await variable.isEqual('systems.moderation.cLinksIncludeClips', false)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'clips') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`clip '${protocol}${test}' should not timeout`, async () => {
              assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: test }))
          })
        }
      }
    }
  })
  describe('moderationLinksClips=true & moderationLinksWithSpaces=false', async () => {
    before(async () => {
      await db.cleanup()
      await message.prepare()

      global.systems.moderation.cLinksIncludeSpaces = false
      await variable.isEqual('systems.moderation.cLinksIncludeSpaces', false)
      global.systems.moderation.cLinksIncludeClips = true
      await variable.isEqual('systems.moderation.cLinksIncludeClips', true)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            if (test.indexOf(' ') > -1 && test.toLowerCase().indexOf('www. ') === -1) { // even if moderationLinksWithSpaces is false - www. google.com should be timeouted
              it(`link '${protocol}${test}' should not timeout`, async () => {
                assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: protocol + test }))
              })
            } else {
              it(`link '${protocol}${test}' should timeout`, async () => {
                assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: protocol + test }))
              })
            }
          }
        }
      }

      if (type === 'clips') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`clip '${protocol}${test}' should timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: test }))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser', badges: {} }, message: test }))
          })
        }
      }
    }
  })
})
