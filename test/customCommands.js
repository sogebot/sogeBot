/* global describe it beforeEach after afterEach before */

var expect = require('chai').expect

require('./general')
var cc = require('../libs/systems/customCommands')

describe('System - Custom Commands', function () {
  describe('#help', function () {
    describe('parsing \'!command\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!command')
        setTimeout(function () { expect(global.output.pop()).to.match(/en.core.usage/); done() }, 500)
      })
    })
    describe('parsing \'!command n/a\'', function () {
      it('parser should return usage text', function (done) {
        global.parser.parse(global.ownerUser, '!command n/a')
        setTimeout(function () { expect(global.output.pop()).to.match(/en.core.usage/); done() }, 500)
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
    describe('parsing \'!command add\'', function () {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!command add')
        setTimeout(function () { done() }, 500)
      })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.customcmds.failed.parse/)
      })
    })
    describe('parsing \'!command add cmd\'', function () {
      beforeEach(function (done) {
        global.parser.parse(global.ownerUser, '!command add cmd')
        setTimeout(function () { done() }, 500)
      })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.customcmds.failed.parse/)
      })
    })
    describe('parsing \'!command add cmd response\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!cmd')
          setTimeout(function () { done() }, 500)
        }, 1100)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success msg', function () {
        expect(global.output.shift()).to.include(global.translate('customcmds.success.add'))
      })
      it('should parse added command in chat', function () {
        expect(global.output.shift()).to.match(/^response/)
      })
    })
    describe('parsing 2x sent \'!command add cmd response\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd response')
        global.parser.parse(global.ownerUser, '!command add cmd response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!cmd')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be once in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send success msg', function () {
        expect(global.output.shift()).to.include(global.translate('customcmds.success.add'))
      })
      it('should send duplicate msg', function () {
        expect(global.output.shift()).to.equal(global.translate('customcmds.failed.add'))
      })
      it('should parse added alias in chat', function () {
        expect(global.output.shift()).to.match(/^response/)
      })
    })
    describe('parsing \'!command add cmd  response\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd  response')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.customcmds.failed.parse/)
      })
    })
    describe('parsing \'!command add cmd response something\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd response something')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!cmd')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^response something/)
      })
    })
  })
  describe('#remove', function () {
    describe('parsing \'!command remove\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd test')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!command remove')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.customcmds.failed.parse/)
      })
    })
    describe('parsing \'!command remove cmd\' without created command', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command remove cmd')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send error message', function () {
        expect(global.output.pop()).to.equal(global.translate('customcmds.failed.remove'))
      })
    })
    describe('parsing \'!command remove cmd\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!command remove cmd')
          setTimeout(function () {
            global.parser.parse(global.ownerUser, '!cmd')
            global.output.shift() // get rid of add success msg
            done()
          }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send success message', function () {
        expect(global.output.shift()).to.equal(global.translate('customcmds.success.remove'))
      })
      it('should not parse in chat', function () {
        expect(global.output.shift()).not.to.match(/^response/)
      })
    })
    describe('parsing 2x sent \'!command remove cmd\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!command remove cmd')
          global.parser.parse(global.ownerUser, '!command remove cmd')
          setTimeout(function () {
            global.parser.parse(global.ownerUser, '!cmd')
            global.output.shift() // get rid of add success msg
            done()
          }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should not be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(0)
          done()
        })
      })
      it('should send not found message', function () {
        expect(global.output.pop()).to.equal(global.translate('customcmds.failed.remove'))
      })
      it('should not parse in chat', function () {
        expect(global.output.pop()).not.to.match(/^response/)
      })
    })
    describe('parsing \'!command remove cmd something\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd response')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!command remove cmd something')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should be in db', function (done) {
        global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
          expect(err).to.equal(null)
          expect(count).to.equal(1)
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.customcmds.failed.parse/)
      })
    })
  })
  describe('#list', function () {
    describe('parsing \'!command list\' when command is added', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command add cmd test')
        global.parser.parse(global.ownerUser, '!command add cmd2 test2')
        setTimeout(function () {
          global.parser.parse(global.ownerUser, '!command list')
          setTimeout(function () { done() }, 500)
        }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send list with cmd and cmd2', function () {
        expect(global.output.pop()).to.match(/en.customcmds.success.list.* !cmd, !cmd2/)
      })
    })
    describe('parsing \'!command list\' when list is empty', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command list')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send empty list', function () {
        expect(global.output.pop()).to.match(/en.customcmds.failed.list/)
      })
    })
    describe('parsing \'!command list nonsense\'', function () {
      before(function (done) {
        global.output = []
        global.parser.parse(global.ownerUser, '!command list nonsemse')
        setTimeout(function () { done() }, 500)
      })
      after(function (done) { global.botDB.remove({}, {multi: true}, function () { done() }) })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/en.customcmds.failed.parse/)
      })
    })
  })
})
