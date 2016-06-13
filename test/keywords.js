/* global describe it beforeEach after before */

var expect = require('chai').expect

var testUser = {username: 'sogehige'}

require('./general')
var keyword = require('../libs/systems/keywords')

describe('System - Keywords', function () {
  describe('#help', function () {
    describe('parsing \'!keyword\'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, '!keyword')
        expect(global.output.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \'!keyword n/a\'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, '!keyword n/a')
        expect(global.output.pop()).to.match(/^Usage:/)
      })
    })
  })
  describe('#add', function () {
    after(function (done) {
      global.output = []
      global.botDB.remove({}, {multi: true}, function () {
        done()
      })
    })
    describe('parsing \'!keyword add\'', function () {
      beforeEach(function () {
        global.parser.parseCommands(testUser, '!keyword add')
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
            expect(err).to.equal(null)
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!keyword add kwd\'', function () {
      beforeEach(function () {
        global.parser.parseCommands(testUser, '!keyword add kwd')
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
            expect(err).to.equal(null)
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!keyword add kwd response\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add kwd response')
        keyword.run(keyword, testUser, 'something something kwd something')
        setTimeout(function () { done() }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success msg', function () {
        expect(global.output.shift()).to.include(global.translate('keywords.success.add'))
      })
      it('should parse added keyword in chat', function () {
        expect(global.output.shift()).to.match(/^response/)
      })
    })
    describe('parsing 2x sent \'!keyword add kwd response\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add kwd Woohoo')
        global.parser.parseCommands(testUser, '!keyword add kwd Woohoo')
        keyword.run(keyword, testUser, 'something something kwd something')
        setTimeout(function () { done() }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be once in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success msg', function () {
        expect(global.output.shift()).to.include(global.translate('keywords.success.add'))
      })
      it('should send duplicate msg', function () {
        expect(global.output.shift()).to.equal(global.translate('keywords.failed.add'))
      })
      it('should parse added keyword in chat', function () {
        expect(global.output.shift()).to.match(/^Woohoo/)
      })
    })
    describe('parsing \'!keyword add kwd  response\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add kwd  response')
        setTimeout(function () { done() }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!keyword add kwd response awesome\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add kwd response awesome')
        keyword.run(keyword, testUser, 'something something kwd something')
        setTimeout(function () { done() }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
  })
  describe('#remove', function () {
    describe('parsing \'!keyword remove\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add keyword test')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!keyword remove')
          setTimeout(function () { done() }, 10)
        }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!keyword remove keyword\' without created keyword', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword remove test')
        setTimeout(function () { done() }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send error message', function () {
        expect(global.output.pop()).to.equal(global.translate('keywords.failed.remove'))
      })
    })
    describe('parsing \'!keyword remove keyword\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add keyword response')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!keyword remove keyword')
          setTimeout(function () {
            keyword.run(keyword, testUser, 'something something keyword something')
            global.output.shift() // get rid of add success msg
            done()
          }, 10)
        }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send success message', function () {
        expect(global.output.shift()).to.equal(global.translate('keywords.success.remove'))
      })
      it('should not parse in chat', function () {
        expect(global.output.shift()).not.to.match(/^Usage:/)
      })
    })
    describe('parsing 2x sent \'!keyword remove keyword\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add keyword response')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!keyword remove keyword')
          global.parser.parseCommands(testUser, '!keyword remove keyword')
          setTimeout(function () {
            keyword.run(keyword, testUser, 'something something keyword something')
            global.output.shift() // get rid of add success msg
            done()
          }, 10)
        }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send not found message', function () {
        expect(global.output.pop()).to.equal(global.translate('keywords.failed.remove'))
      })
      it('should not parse in chat', function () {
        expect(global.output.pop()).not.to.match(/^Usage:/)
      })
    })
    describe('parsing \'!keyword remove keyword something\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add keyword response')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!keyword remove keyword something')
          setTimeout(function () { done() }, 10)
        }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
  })
  describe('#list', function () {
    describe('parsing \'!keyword list\' when keyword is added', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword add keyword test')
        global.parser.parseCommands(testUser, '!keyword add keyword2 test2')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!keyword list')
          setTimeout(function () { done() }, 10)
        }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send list with keyword and keyword2', function () {
        expect(global.output.pop()).to.equal('List of keywords: keyword, keyword2')
      })
    })
    describe('parsing \'!keyword list\' when list is empty', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword list')
        setTimeout(function () { done() }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send empty list', function () {
        expect(global.output.pop()).to.equal('List of keywords is empty')
      })
    })
    describe('parsing \'!keyword list nonsense\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parseCommands(testUser, '!keyword list nonsemse')
        setTimeout(function () { done() }, 10)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
  })
})
