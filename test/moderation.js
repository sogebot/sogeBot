/* global describe it after before */

var expect = require('chai').expect
var testUser = {username: 'sogehige'}
var testUser2 = {username: 'soge'}

require('./general')
require('../libs/systems/moderation')

describe('System - Moderation', function () {
  describe('Links', function () {
    describe('http://google.com - moderation OFF', function () {
      before(function (done) {
        global.parser.parse(testUser, '!set moderationLinks false')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.timeouts = []
        global.output = []
        global.parser.parse(testUser, '!set moderationLinks true')
        setTimeout(function () { done() }, 500)
      })
      it('will not timeout user', function (done) {
        global.parser.parse(testUser2, 'http://www.google.com')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
    })
    describe('#42 - proc hrajes tohle auto je dost na nic ....', function () {
      after(function (done) {
        global.timeouts = []
        global.output = []
        setTimeout(function () { done() }, 500)
      })
      it('will not timeout user', function (done) {
        global.parser.parse(testUser2, 'proc hrajes tohle auto je dost na nic ....')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
    })
    describe('http://google.com', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'http://google.com')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
        global.output = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('http://www.google.com', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'http://www.google.com')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('http://youtu.be/123jAJD123', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'http://youtu.be/123jAJD123')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('https://google.com', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'https://google.com')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('https://www.google.com', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'https://www.google.com')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('https://youtu.be/123jAJD123', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'https://youtu.be/123jAJD123')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('google.com', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'google.com')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('www.google.com', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'www.google.com')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
    describe('youtu.be/123jAJD123', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'youtu.be/123jAJD123')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
      })
    })
  })
  describe('Symbols', function () {
    describe('!@#$%^&*()(*&^%$#@#$%^&*) - moderation OFF', function () {
      before(function (done) {
        global.parser.parse(testUser, '!set moderationSymbols false')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.timeouts = []
        global.output = []
        global.parser.parse(testUser, '!set moderationSymbols true')
        setTimeout(function () { done() }, 500)
      })
      it('will not timeout user', function (done) {
        global.parser.parse(testUser2, '!@#$%^&*()(*&^%$#@#$%^&*)')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
    })
    describe('!@#$%^&*()(*&^%$#@#$%^&*)', function () {
      before(function (done) {
        global.parser.parse(testUser2, '!@#$%^&*()(*&^%$#@#$%^&*)')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.symbols') + ' 20')
      })
    })
    describe('!@#$%^&*( one two (*&^%$#@#', function () {
      before(function (done) {
        global.parser.parse(testUser2, '!@#$%^&*( one two (*&^%$#@#')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.symbols') + ' 20')
      })
    })
    describe('!@#$%^&*( one two three four (*&^%$#@ one two three four #$%^&*)', function () {
      before(function (done) {
        global.parser.parse(testUser2, '!@#$%^&*( one two three four (*&^%$#@ one two three four #$%^&*)')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('not timeout user', function () {
        expect(global.timeouts).to.be.empty
      })
    })
    describe('!@#$%^&*()(*&^', function () {
      before(function (done) {
        global.parser.parse(testUser2, '!@#$%^&*()(*&^')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('not timeout user', function () {
        expect(global.timeouts).to.be.empty
      })
    })
  })
  describe('Long Message', function () {
    describe('asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs - moderation OFF', function () {
      before(function (done) {
        global.parser.parse(testUser, '!set moderationLongMessage false')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.timeouts = []
        global.output = []
        global.parser.parse(testUser, '!set moderationLongMessage true')
        setTimeout(function () { done() }, 500)
      })
      it('will not timeout user', function (done) {
        global.parser.parse(testUser2, 'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
    })
    describe('asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'asdfstVTzgo3KrfNekGTjomK7nBjEX9B3Vw4qctminLjzfqbT8q6Cd23pVSuw0wuWPAJE9vaBDC4PIYkKCleX8yBXBiQMKwJWb8uonmbOzNgpuMpcF6vpF3mRc8bbonrfVHqbT00QpjPJHXOF88XrjgR8v0BQVlsX61lpT8vbqjZRlizoMa2bruKU3GtONgZhtJJQyRJEVo3OTiAgha2kC0PHUa8ZSRNCoTsDWc76BTfa2JntlTgIXmX2aXTDQEyBomkSQAof4APE0sfX9HvEROQqP9SSf09VK1weXNcsmMs')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.longMessage') + ' 20')
      })
    })
  })
  describe('Caps', function () {
    describe('AAAAAAAAAAAAAAAAAAAAAA - moderation OFF', function () {
      before(function (done) {
        global.parser.parse(testUser, '!set moderationCaps false')
        global.parser.parse(testUser, '!set moderationSpam false')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.timeouts = []
        global.output = []
        global.parser.parse(testUser, '!set moderationCaps true')
        setTimeout(function () { done() }, 500)
      })
      it('will not timeout user', function (done) {
        global.parser.parse(testUser2, 'AAAAAAAAAAAAAAAAAAAAAA')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
    })
    describe('AAAAAAAAAAAAAAAAAAAAAA', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'AAAAAAAAAAAAAAAAAAAAAA')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.caps') + ' 20')
      })
    })
    describe('AAAAAAAAAAAAAaaaaaaaaaaaa', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'AAAAAAAAAAAAAaaaaaaaaaaaa')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.caps') + ' 20')
      })
    })
  })
  describe('Spam', function () {
    describe('Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum - moderation OFF', function () {
      before(function (done) {
        global.parser.parse(testUser, '!set moderationSpam false')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.timeouts = []
        global.output = []
        global.parser.parse(testUser, '!set moderationSpam true')
        setTimeout(function () { done() }, 500)
      })
      it('will not timeout user', function (done) {
        global.parser.parse(testUser2, 'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
    })
    describe('Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.spam') + ' 300')
      })
    })
    describe('Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum', function () {
      before(function (done) {
        global.parser.parse(testUser2, 'Lorem Ipsum Lorem Ipsum test 1 2 3 4 Lorem Ipsum Lorem Ipsum')
        setTimeout(function () { done() }, 500)
      })
      after(function () {
        global.timeouts = []
      })
      it('timeout user', function () {
        expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.spam') + ' 300')
      })
    })
  })
  describe('!permit', function () {
    describe('parsing \'!permit\'', function () {
      before(function (done) {
        global.parser.parse(testUser, '!permit')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.output = []
        global.timeouts = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        global.botDB.count({type: 'permitLink'}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!permit [username]\'', function () {
      before(function (done) {
        global.parser.parse(testUser, '!permit soge')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.output = []
        global.timeouts = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        global.botDB.count({type: 'permitLink'}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success message', function () {
        expect(global.output.pop()).to.equal(global.translate('moderation.permit').replace('(who)', 'soge'))
      })
      it('should not timeout user on first link message', function (done) {
        global.parser.parse(testUser2, 'http://www.google.com')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
      it('should timeout user on second link message', function (done) {
        global.parser.parse(testUser2, 'http://www.google.com')
        setTimeout(function () {
          expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
          done()
        }, 500)
      })
      it('should not be in db', function (done) {
        global.botDB.count({type: 'permitLink'}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
    })
    describe('parsing \'!permit [username]\' - case sensitive test', function () {
      before(function (done) {
        global.parser.parse(testUser, '!permit SOGE')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        global.botDB.count({type: 'permitLink'}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success message', function () {
        expect(global.output.pop()).to.equal(global.translate('moderation.permit').replace('(who)', 'SOGE'))
      })
      it('should not timeout user on first link message', function (done) {
        global.parser.parse(testUser2, 'http://www.google.com')
        setTimeout(function () {
          expect(global.timeouts).to.be.empty
          done()
        }, 500)
      })
      it('should timeout user on second link message', function (done) {
        global.parser.parse(testUser2, 'http://www.google.com')
        setTimeout(function () {
          expect(global.timeouts).to.contain('soge: ' + global.translate('moderation.links') + ' 5')
          done()
        }, 500)
      })
      it('should not be in db', function (done) {
        global.botDB.count({type: 'permitLink'}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
    })
  })
})
