var expect = require('chai').expect
var testUser = {username: 'sogehige'}

require('./general')
var cc = require('../libs/systems/customCommands')

describe('System - Custom Commands', function () {
  describe('#help', function () {
    describe('parsing \'!command\'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, '!command')
        expect(global.output.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \'!command \'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, '!command ')
        expect(global.output.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \' !command\'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, ' !command')
        expect(global.output.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \' !command  \'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, ' !command  ')
        expect(global.output.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \'!command  \'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, ' !command  ')
        expect(global.output.pop()).to.match(/^Usage:/)
      })
    })
  })
  describe('#add', function () {
    describe('parsing \'!command add\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!command add')
          done()
        })
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function (done) {
        setTimeout(function () {
          expect(global.output.pop()).to.match(/^Sorry,/)
          done()
        }, 10)
      })
    })
    describe('parsing \'!command add command\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!command add command')
          done()
        })
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function (done) {
        setTimeout(function () {
          expect(global.output.pop()).to.match(/^Sorry,/)
          done()
        }, 10)
      })
    })
    describe('parsing \'!command add <command> <response>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          cc.add(cc, testUser, 'cmd test')
          done()
        })
      })
      afterEach(function() {
        global.output = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send success msg', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(global.output.pop()).to.equal(global.translate('customcmds.success.add'))
            done()
          })
        }, 10)
      })
      it('should parse added command in chat', function (done) {
        setTimeout(function () {
          global.parser.parse(testUser, '!cmd')
          setTimeout(function () {
            expect(global.output.pop()).to.match(/^test$/)
            done()
          }, 100)
        }, 10)
      })
    })
    describe('parsing 2x sent \'!command add <command> <response>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          cc.add(cc, testUser, 'cmd test')
          cc.add(cc, testUser, 'cmd test')
          done()
        })
      })
      afterEach(function() {
        global.output = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be once in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send duplicate msg', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(global.output.pop()).to.equal(global.translate('customcmds.failed.add'))
            done()
          })
        }, 10)
      })
      it('should parse added command in chat', function (done) {
        setTimeout(function () {
          global.parser.parse(testUser, '!cmd')
          setTimeout(function () {
            expect(global.output.pop()).to.match(/^test$/)
            done()
          }, 100)
        }, 10)
      })
    })
    describe('parsing \'!command add <command>  <response>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!command add alias  test')
          done()
        })
      })
      afterEach(function() {
        global.output = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!command add <command> <response> <something>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          cc.add(cc, testUser, 'cmd test something')
          done()
        })
      })
      afterEach(function() {
        global.output = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send success msg', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(global.output.pop()).to.equal(global.translate('customcmds.success.add'))
            done()
          })
        }, 10)
      })
      it('should parse added command in chat', function (done) {
        setTimeout(function () {
          global.parser.parse(testUser, '!cmd')
          setTimeout(function () {
            expect(global.output.pop()).to.match(/^test something$/)
            done()
          }, 100)
        }, 10)
      })
    })
  })
  describe('#remove', function () {
    describe('parsing \'!command remove\'', function () {
      beforeEach(function (done) {
        cc.add(cc, testUser, 'cmd test')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!command remove')
          done()
        }, 100)
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!command remove cmd\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          cc.add(cc, testUser, 'cmd test')
          setTimeout(function () {
            global.parser.parseCommands(testUser, '!command remove cmd')
            done()
          }, 100)
        })
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send success message', function (done) {
        setTimeout(function () {
          expect(global.output.pop()).to.equal(global.translate('customcmds.success.remove'))
          done()
        }, 100)
      })
      it('should not parse  command in chat', function (done) {
        setTimeout(function () {
          global.parser.parse(testUser, '!cmd')
          setTimeout(function () {
            expect(global.output.pop()).not.to.match(/^test something$/)
            done()
          }, 100)
        }, 10)
      })
    })
    describe('parsing 2x sent \'!command remove cmd\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          cc.add(cc, testUser, 'cmd test')
          setTimeout(function () {
            global.parser.parseCommands(testUser, '!command remove cmd')
            global.parser.parseCommands(testUser, '!command remove cmd')
            done()
          }, 100)
        })
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send not found message', function (done) {
        setTimeout(function () {
          expect(global.output.pop()).to.equal(global.translate('customcmds.failed.remove'))
          done()
        }, 100)
      })
      it('should not parse  command in chat', function (done) {
        setTimeout(function () {
          global.parser.parse(testUser, '!cmd')
          setTimeout(function () {
            expect(global.output.pop()).not.to.match(/^test something$/)
            done()
          }, 100)
        }, 10)
      })
    })
    describe('parsing \'!command remove alias something\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          cc.add(cc, testUser, 'cmd test')
          setTimeout(function () {
            global.parser.parseCommands(testUser, '!command remove test something')
            done()
          }, 100)
        })
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('customcmds') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
  })
  describe('#list', function () {
    describe('parsing \'!command list\' when cmd is added', function () {
      beforeEach(function (done) {
        cc.add(cc, testUser, 'cmd test')
        cc.add(cc, testUser, 'cmd2 test')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!command list')
          done()
        }, 100)
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should send list with test and test2', function (done) {
        setTimeout(function () {
          expect(global.output.pop()).to.equal('List of commands: !cmd, !cmd2')
          done()
        }, 100)
      })
    })
    describe('parsing \'!command list\' when list is empty', function () {
      beforeEach(function (done) {
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!command list')
          done()
        }, 100)
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should send empty list', function (done) {
        setTimeout(function () {
          expect(global.output.pop()).to.equal('List of commands is empty')
          done()
        }, 100)
      })
    })
    describe('parsing \'!command list nonsense\'', function () {
      beforeEach(function (done) {
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!command list nonsense')
          done()
        }, 100)
      })
      after(function (done) {
        global.output = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should send parse error', function () {
        expect(global.output.pop()).to.match(/^Sorry,/)
      })
    })
  })
})
