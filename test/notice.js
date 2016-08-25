/* global describe it beforeEach after afterEach before */

require('./general')
var expect = require('chai').expect
require('../libs/systems/notice')

var cleanup = function (done) {
  global.output = []
  global.botDB.remove({}, {multi: true}, function () { done() })
}

describe('System - Notice', function () {
  describe('#settings', function () {
    describe('noticeInterval', function () {
      describe('/num/', function () {
        before(function (done) {
          global.parser.parse(global.ownerUser, '!set noticeInterval 10')
          setTimeout(function () { done() }, 500)
        })
        after(function (done) { cleanup(done) })
        it('success message expected', function () {
          expect(global.output.pop()).to.be.equal(global.translate('notice.settings.noticeInterval').replace('(value)', 10))
        })
        it('should be set in db', function (done) {
          global.botDB.find({type: 'settings', noticeInterval: 10}, function (err, items) {
            expect(err).to.be.null
            expect(items).to.not.be.empty
            expect(items[0].noticeInterval).to.be.equal(10)
            done()
          })
        })
      })
      describe('/string/', function () {
        before(function (done) {
          global.parser.parse(global.ownerUser, '!set noticeInterval test')
          setTimeout(function () { done() }, 500)
        })
        after(function (done) { cleanup(done) })
        it('expect parse error', function () {
          expect(global.output.pop()).to.match(/^Sorry,/)
        })
        it('should not be set in db', function (done) {
          global.botDB.find({type: 'settings', noticeInterval: 10}, function (err, items) {
            expect(err).to.be.null
            expect(items).to.be.empty
            done()
          })
        })
      })
      describe('/empty/', function () {
        before(function (done) {
          global.parser.parse(global.ownerUser, '!set noticeInterval')
          setTimeout(function () { done() }, 500)
        })
        after(function (done) { cleanup(done) })
        it('expect parse error', function () {
          expect(global.output.pop()).to.match(/^Sorry,/)
        })
        it('should not be set in db', function (done) {
          global.botDB.find({type: 'settings', noticeInterval: 10}, function (err, items) {
            expect(err).to.be.null
            expect(items).to.be.empty
            done()
          })
        })
      })
    })
    describe('noticeMsgReq', function () {
      describe('/num/', function () {
        before(function (done) {
          global.parser.parse(global.ownerUser, '!set noticeMsgReq 10')
          setTimeout(function () { done() }, 500)
        })
        after(function (done) { cleanup(done) })
        it('success message expected', function () {
          expect(global.output.pop()).to.be.equal(global.translate('notice.settings.noticeMsgReq').replace('(value)', 10))
        })
        it('should be set in db', function (done) {
          global.botDB.find({type: 'settings', noticeMsgReq: 10}, function (err, items) {
            expect(err).to.be.null
            expect(items).to.not.be.empty
            expect(items[0].noticeMsgReq).to.be.equal(10)
            done()
          })
        })
      })
      describe('/string/', function () {
        before(function (done) {
          global.parser.parse(global.ownerUser, '!set noticeMsgReq test')
          setTimeout(function () { done() }, 500)
        })
        after(function (done) { cleanup(done) })
        it('expect parse error', function () {
          expect(global.output.pop()).to.match(/^Sorry,/)
        })
        it('should not be set in db', function (done) {
          global.botDB.find({type: 'settings', noticeMsgReq: 10}, function (err, items) {
            expect(err).to.be.null
            expect(items).to.be.empty
            done()
          })
        })
      })
      describe('/empty/', function () {
        before(function (done) {
          global.parser.parse(global.ownerUser, '!set noticeMsgReq')
          setTimeout(function () { done() }, 500)
        })
        after(function (done) { cleanup(done) })
        it('expect parse error', function () {
          expect(global.output.pop()).to.match(/^Sorry,/)
        })
        it('should not be set in db', function (done) {
          global.botDB.find({type: 'settings', noticeMsgReq: 10}, function (err, items) {
            expect(err).to.be.null
            expect(items).to.be.empty
            done()
          })
        })
      })
    })
  })
  describe('#help', function () {
    describe('parsing \'!notice\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!notice')
        setTimeout(function () { expect(global.output.pop()).to.match(/en.core.usage/); done() }, 600)
      })
    })
    describe('parsing \'!notice n/a\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!notice n/a')
        setTimeout(function () { expect(global.output.pop()).to.match(/en.core.usage/); done() }, 600)
      })
    })
  })
  describe('#add', function () {
    afterEach(function (done) { cleanup(done) })
    describe('parsing \'!notice add\'', function () {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!notice add')
        setTimeout(function () { done() }, 500)
      })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('notice') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.notice.failed.parse/)
      })
    })
    describe('parsing \'!notice add test\'', function () {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!notice add test')
        setTimeout(function () { done() }, 500)
      })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('notice') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('expect success message', function () {
        expect(global.output.pop()).to.equal(global.translate('notice.success.add'))
      })
    })
    describe('parsing \'!notice add some longer text  qwerty\'', function () {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!notice add some longer text  qwerty')
        setTimeout(function () { done() }, 500)
      })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('notice') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('expect success message', function () {
        expect(global.output.pop()).to.equal(global.translate('notice.success.add'))
      })
    })
    describe('parsing 2x \'!notice add test\'', function () {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!notice add test')
        global.parser.parse(global.ownerUser, '!notice add test')
        setTimeout(function () { done() }, 500)
      })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('notice') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('expect success message', function () {
        expect(global.output).to.include(global.translate('notice.success.add'))
      })
      it('expect duplicate fail message', function () {
        expect(global.output).to.include(global.translate('notice.failed.add'))
      })
    })
  })
  describe('#list', function () {
    describe('parsing \'!notice list\' when notice is added', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!notice add test')
        global.parser.parse(global.ownerUser, '!notice add test2')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!notice list')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should send list', function () {
        expect(global.output.pop()).to.match(/en.notice.success.list/)
      })
    })
    describe('parsing \'!notice list\' when list is empty', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!notice list')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should send empty list', function () {
        expect(global.output.pop()).to.match(/en.notice.failed.list/)
      })
    })
    describe('parsing \'!notice list nonsense\'', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!notice list nonsemse')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.notice.failed.parse/)
      })
    })
  })
  describe('#get', function () {
    describe('parsing \'!notice get id\' when notice is added', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!notice add test')
        setTimeout(function () {
          global.botDB.findOne({$where: function () { return this._id.startsWith('notice') }}, function (err, notice) {
            if (err) console.log(err)
            global.parser.parse(global.ownerUser, '!notice get ' + notice._id.split('_')[1])
            setTimeout(function () { done() }, 500)
          })
        }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should get notice', function () {
        expect(global.output.pop()).to.match(/^Notice#/)
      })
    })
    describe('parsing \'!notice get id\' when notice is not added', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!notice get ashed123h1jkh3kj')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should not get notice', function () {
        expect(global.output.pop()).to.be.equal(global.translate('notice.failed.notFound'))
      })
    })
    describe('parsing \'!notice get\'', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!notice get')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.notice.failed.parse/)
      })
    })
  })
  describe('#remove', function () {
    describe('parsing \'!notice remove\'', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!notice remove')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.notice.failed.parse/)
      })
    })
    describe('parsing \'!notice remove some thing\'', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!notice remove some thing')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.notice.failed.parse/)
      })
    })
    describe('parsing \'!notice remove id\' without created notice', function () {
      before(function (done) {
        global.parser.parse(global.ownerUser, '!notice remove 123815891')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.equal(global.translate('notice.failed.notFound'))
      })
    })
    describe('parsing \'!notice remove id\' with created notice', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!notice add test')
        setTimeout(function () {
          global.botDB.findOne({$where: function () { return this._id.startsWith('notice') }}, function (err, notice) {
            if (err) console.log(err)
            global.parser.parse(global.ownerUser, '!notice remove ' + notice._id.split('_')[1])
            setTimeout(function () { done() }, 500)
          })
        }, 500)
      })
      after(function (done) { cleanup(done) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('notice') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send success msg', function () {
        expect(global.output.pop()).to.equal(global.translate('notice.success.remove'))
      })
    })
  })
  describe('#trigger', function () {
    before(function (done) {
      this.timeout(50000)
      global.parser.parse(global.ownerUser, '!set noticeMsgReq 5')
      global.parser.parse(global.ownerUser, '!set noticeInterval 0')
      global.parser.parse(global.ownerUser, '!notice add test')
      // reset parser line count
      global.parser.linesParsed = 0
      setTimeout(function () {
        for (var i = 0; i < 11; i++) {
          setTimeout(function () {
            global.parser.parse(global.ownerUser, i.toString())
          }, 500 * i)
        }
        setTimeout(function () { done() }, 10000)
      }, 600)
    })
    it('trigger after 5 messages', function () {
      expect(global.output.length).to.be.equal(5) // 3 for success messages, 2 for notices
    })
  })
})
