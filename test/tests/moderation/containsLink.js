/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const tmi = require('../../general.js').tmi

const assert = require('chai').assert

const owner = { username: 'soge__' }

const tests = {
  'clips': [
    'clips.twitch.tv/TolerantExquisiteDuckOneHand'
  ],
  'links': [ // tests will test links, http://links, https://links
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
      await tmi.waitForConnection()
      global.commons.sendMessage.reset()
      await db.cleanup()
      global.parser.parse(owner, '!set moderationLinksWithSpaces true')
      await message.isSent('core.settings.moderation.moderationLinksWithSpaces.true', owner)
      global.parser.parse(owner, '!set moderationLinksClips true')
      await message.isSent('core.settings.moderation.moderationLinksClips.true', owner)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert.isTrue(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, protocol + test))
            })
          }
        }
      }

      if (type === 'clips') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`clip '${protocol}${test}' should timeout`, async () => {
              assert.isTrue(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, protocol + test))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isFalse(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, test))
          })
        }
      }
    }
  })
  describe('moderationLinksClips=false & moderationLinksWithSpaces=true', async () => {
    before(async () => {
      await tmi.waitForConnection()
      global.commons.sendMessage.reset()
      await db.cleanup()
      global.parser.parse(owner, '!set moderationLinksWithSpaces true')
      await message.isSent('core.settings.moderation.moderationLinksWithSpaces.true', owner)
      global.parser.parse(owner, '!set moderationLinksClips false')
      await message.isSent('core.settings.moderation.moderationLinksClips.false', owner)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert.isTrue(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, protocol + test))
            })
          }
        }
      }

      if (type === 'clips') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            it(`clip '${protocol}${test}' should not timeout`, async () => {
              assert.isFalse(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, protocol + test))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isFalse(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, test))
          })
        }
      }
    }
  })
  describe('moderationLinksClips=true & moderationLinksWithSpaces=false', async () => {
    before(async () => {
      await tmi.waitForConnection()
      global.commons.sendMessage.reset()
      await db.cleanup()
      global.parser.parse(owner, '!set moderationLinksWithSpaces false')
      await message.isSent('core.settings.moderation.moderationLinksWithSpaces.false', owner)
      global.parser.parse(owner, '!set moderationLinksClips true')
      await message.isSent('core.settings.moderation.moderationLinksClips.true', owner)
    })

    for (let [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        let protocols = ['', 'http://', 'https://']
        for (let protocol of protocols) {
          for (let test of listOfTests) {
            if (test.indexOf(' ') > -1 && test.toLowerCase().indexOf('www. ') === -1) { // even if moderationLinksWithSpaces is false - www. google.com should be timeouted
              it(`link '${protocol}${test}' should not timeout`, async () => {
                assert.isFalse(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, protocol + test))
              })
            } else {
              it(`link '${protocol}${test}' should timeout`, async () => {
                assert.isTrue(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, protocol + test))
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
              assert.isTrue(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, test))
            })
          }
        }
      }

      if (type === 'texts') {
        for (let test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert.isFalse(await global.systems.moderation.containsLink(global.systems.moderation, { username: 'testuser' }, test))
          })
        }
      }
    }
  })
})
