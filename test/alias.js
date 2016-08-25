/* global describe it after before */

require('./general')
var expect = require('chai').expect
var alias = require('../libs/systems/alias')

describe('System - Alias', function () {
  describe('#help', function () {
    describe('parsing \'!alias\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!alias')
        setTimeout(function () {
          expect(global.output.pop()).to.match(/en.core.usage/)
          done()
        }, 500)
      })
    })
    describe('parsing \'!alias n/a\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!alias n/a')
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
    describe('parsing \'!alias add\'', function (done) {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!alias add')
        setTimeout(function () { done() }, 500)
      })
      after(function () { global.timeouts = []; global.output = [] })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.parse/)
      })
    })
    describe('parsing \'!alias add command\'', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!alias add command')
        setTimeout(function () { done() }, 500)
      })
      after(function () { global.timeouts = []; global.output = [] })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.parse/)
      })
    })
    describe('parsing \'!alias add command alias\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!test')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.timeouts = []; global.output = []; global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success msg', function () {
        expect(global.output.shift()).to.include(global.translate('alias.success.add'))
      })
      it('should parse added alias in chat', function () {
        expect(global.output.shift()).to.match(/en.core.usage/)
      })
    })
    describe('parsing 2x sent \'!alias add command alias\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test')
        global.parser.parse(global.ownerUser, '!alias add alias test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!test')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be once in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success msg', function () {
        expect(global.output.shift()).to.include(global.translate('alias.success.add'))
      })
      it('should send duplicate msg', function () {
        expect(global.output.shift()).to.equal(global.translate('alias.failed.add'))
      })
      it('should parse added alias in chat', function () {
        expect(global.output.shift()).to.match(/en.core.usage/)
      })
    })
    describe('parsing \'!alias add command  alias\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias  test')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.parse/)
      })
    })
    describe('parsing \'!alias add command alias something\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test something')
        alias.parse(alias, global.ownerUser, '!test')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.parse/)
      })
    })
  })
  describe('#remove', function () {
    describe('parsing \'!alias remove\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!alias remove')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.parse/)
      })
    })
    describe('parsing \'!alias remove alias\' without created alias', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias remove test')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send error message', function () {
        expect(global.output.pop()).to.equal(global.translate('alias.failed.remove'))
      })
    })
    describe('parsing \'!alias remove alias\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!alias remove test')
          setTimeout(function () {
            alias.parse(alias, global.ownerUser, '!test')
            global.output.shift() // get rid of add success msg
            done()
          }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send success message', function () {
        expect(global.output.shift()).to.equal(global.translate('alias.success.remove'))
      })
      it('should not parse in chat', function () {
        expect(global.output.shift()).not.to.match(/en.core.usage/)
      })
    })
    describe('parsing 2x sent \'!alias remove alias\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!alias remove test')
          global.parser.parse(global.ownerUser, '!alias remove test')
          setTimeout(function () {
            alias.parse(alias, global.ownerUser, '!test')
            global.output.shift() // get rid of add success msg
            done()
          }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send not found message', function () {
        expect(global.output.pop()).to.equal(global.translate('alias.failed.remove'))
      })
      it('should not parse in chat', function () {
        expect(global.output.pop()).not.to.match(/en.core.usage/)
      })
    })
    describe('parsing \'!alias remove alias something\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!alias remove test something')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.parse/)
      })
    })
  })
  describe('#list', function () {
    describe('parsing \'!alias list\' when alias is added', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias add alias test')
        global.parser.parse(global.ownerUser, '!alias add alias test2')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!alias list')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send list with test and test2', function () {
        expect(global.output.pop()).to.match(/en.alias.success.list.* !test, !test2/)
      })
    })
    describe('parsing \'!alias list\' when list is empty', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias list')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send empty list', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.list/)
      })
    })
    describe('parsing \'!alias list nonsense\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!alias list nonsemse')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.alias.failed.parse/)
      })
    })
  })
})
