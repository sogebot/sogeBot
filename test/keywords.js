/* global describe it beforeEach after before */

require('./general')
var expect = require('chai').expect
var keyword = require('../libs/systems/keywords')
/*
describe('System - Keywords', function () {
  describe('#help', function () {
    describe('parsing \'!keyword\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!keyword')
        setTimeout(function () {
          expect(global.output.pop()).to.match(/en.core.usage/)
          done()
        }, 500)
      })
    })
    describe('parsing \'!keyword n/a\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!keyword n/a')
        setTimeout(function () {
          expect(global.output.pop()).to.match(/en.core.usage/)
          done()
        }, 500)
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
    describe('parsing \'!keyword add\'', function (done) {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!keyword add')
        setTimeout(function () { done() }, 500)
      })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.keywords.failed.parse/)
      })
    })
    describe('parsing \'!keyword add kwd\'', function (done) {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!keyword add kwd')
        setTimeout(function () { done() }, 500)
      })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('kwd') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.keywords.failed.parse/)
      })
    })
    describe('parsing \'!keyword add kwd response\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword add kwd response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, 'something something kwd something')
          setTimeout(function () { done() }, 500)
        }, 500)
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
        global.parser.parse(global.ownerUser, '!keyword add kwd Woohoo')
        global.parser.parse(global.ownerUser, '!keyword add kwd Woohoo')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, 'something something kwd something')
          setTimeout(function () { done() }, 500)
        }, 500)
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
        global.parser.parse(global.ownerUser, '!keyword add kwd  response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, 'something something kwd something')
          setTimeout(function () { done() }, 500)
        }, 500)
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
    describe('parsing \'!keyword add kwd response awesome\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword add kwd response awesome')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, 'something something kwd something')
          setTimeout(function () { done() }, 500)
        }, 500)
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
  })
  describe('#remove', function () {
    describe('parsing \'!keyword remove\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword add keyword test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!keyword remove')
          setTimeout(function () { done() }, 500)
        }, 500)
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
        expect(global.output.pop()).to.match(/en.keywords.failed.parse/)
      })
    })
    describe('parsing \'!keyword remove keyword\' without created keyword', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword remove test')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send error message', function () {
        expect(global.output.pop()).to.equal(global.translate('keywords.failed.remove'))
      })
    })
    describe('parsing \'!keyword remove keyword\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword add keyword response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!keyword remove keyword')
          setTimeout(function () {
            keyword.run(keyword, global.ownerUser, 'something something keyword something')
            global.output.shift() // get rid of add success msg
            done()
          }, 500)
        }, 500)
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
        expect(global.output.shift()).not.to.match(/en.core.usage/)
      })
    })
    describe('parsing 2x sent \'!keyword remove keyword\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword add keyword response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!keyword remove keyword')
          global.parser.parse(global.ownerUser, '!keyword remove keyword')
          setTimeout(function () {
            keyword.run(keyword, global.ownerUser, 'something something keyword something')
            global.output.shift() // get rid of add success msg
            done()
          }, 500)
        }, 500)
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
        expect(global.output.pop()).not.to.match(/en.core.usage/)
      })
    })
    describe('parsing \'!keyword remove keyword something\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword add keyword response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!keyword remove keyword something')
          setTimeout(function () { done() }, 500)
        }, 500)
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
        expect(global.output.pop()).to.match(/en.keywords.failed.parse/)
      })
    })
  })
  describe('#list', function () {
    describe('parsing \'!keyword list\' when keyword is added', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword add keyword test')
        global.parser.parse(global.ownerUser, '!keyword add keyword2 test2')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!keyword list')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send list with keyword and keyword2', function () {
        expect(global.output.pop()).to.match(/en.keywords.success.list.* keyword, keyword2/)
      })
    })
    describe('parsing \'!keyword list\' when list is empty', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword list')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send empty list', function () {
        expect(global.output.pop()).to.match(/en.keywords.failed.list/)
      })
    })
    describe('parsing \'!keyword list nonsense\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!keyword list nonsemse')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.keywords.failed.parse/)
      })
    })
  })
})
*/