/* global describe it before */
if (require('cluster').isWorker) process.exit()

require('../../general.js')

const db = require('../../general.js').db
const variable = require('../../general.js').variable
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

      await (global.systems.moderation.settings.links.includeSpaces = true)
      await variable.isEqual('systems.moderation.settings.links.includeSpaces', true)
      await (global.systems.moderation.settings.links.includeClips = true)
      await variable.isEqual('systems.moderation.settings.links.includeClips', true)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'clips') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`clip '${protocol}${test}' should timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: test }))
          })
        }
      }
    }
  })
  describe('moderationLinksClips=false & moderationLinksWithSpaces=true', async () => {
    before(async () => {
      await db.cleanup()

      await (global.systems.moderation.settings.links.includeSpaces = true)
      await variable.isEqual('systems.moderation.settings.links.includeSpaces', true)
      await (global.systems.moderation.settings.links.includeClips = false)
      await variable.isEqual('systems.moderation.settings.links.includeClips', false)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'clips') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`clip '${protocol}${test}' should not timeout`, async () => {
              assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: protocol + test }))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: test }))
          })
        }
      }
    }
  })
  describe('moderationLinksClips=true & moderationLinksWithSpaces=false', async () => {
    before(async () => {
      await db.cleanup()

      await (global.systems.moderation.settings.links.includeSpaces = false)
      await variable.isEqual('systems.moderation.settings.links.includeSpaces', false)
      await (global.systems.moderation.settings.links.includeClips = true)
      await variable.isEqual('systems.moderation.settings.links.includeClips', true)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            if (test.indexOf(' ') > -1 && test.toLowerCase().indexOf('www. ') === -1) { // even if moderationLinksWithSpaces is false - www. google.com should be timeouted
              it(`link '${protocol}${test}' should not timeout`, async () => {
                assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: protocol + test }))
              })
            } else {
              it(`link '${protocol}${test}' should timeout`, async () => {
                assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: protocol + test }))
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
              assert.isFalse(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: test }))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isTrue(await global.systems.moderation.containsLink({ sender: { username: 'testuser' }, message: test }))
          })
        }
      }
    }
  })
})
