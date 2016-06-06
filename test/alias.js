var expect = require('chai').expect

var testData = []
var testUser = {username: 'sogehige'}

require('./general')
var alias = require('../libs/systems/alias')

global.commons.sendMessage = function (text) {
  testData.push(text)
}

describe('System - Alias', function () {
  describe('#help', function () {
    describe('parsing \'!alias\'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, '!alias')
        expect(testData.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \'!alias \'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, '!alias ')
        expect(testData.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \' !alias\'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, ' !alias')
        expect(testData.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \' !alias  \'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, ' !alias  ')
        expect(testData.pop()).to.match(/^Usage:/)
      })
    })
    describe('parsing \'!alias  \'', function () {
      it('parser should return usage text', function () {
        global.parser.parseCommands(testUser, ' !alias  ')
        expect(testData.pop()).to.match(/^Usage:/)
      })
    })
  })
  describe('#add', function () {
    describe('parsing \'!alias add\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!alias add')
          done()
        })
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function (done) {
        setTimeout(function () {
          expect(testData.pop()).to.match(/^Sorry,/)
          done()
        }, 10)
      })
    })
    describe('parsing \'!alias add command\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!alias add command')
          done()
        })
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function (done) {
        setTimeout(function () {
          expect(testData.pop()).to.match(/^Sorry,/)
          done()
        }, 10)
      })
    })
    describe('parsing \'!alias add <command> <alias>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!alias add alias test')
          done()
        })
      })
      afterEach(function() {
        testData = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send success msg', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(testData.pop()).to.equal(global.translate('alias.success.add'))
            done()
          })
        }, 10)
      })
      it('should parse added alias in chat', function (done) {
        setTimeout(function () {
          alias.parse(null, testUser, '!test')
          setTimeout(function () {
            expect(testData.pop()).to.match(/^Usage:/)
            done()
          }, 100)
        }, 10)
      })
    })
    describe('parsing 2x sent \'!alias add <command> <alias>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!alias add alias test')
          global.parser.parseCommands(testUser, '!alias add alias test')
          done()
        })
      })
      afterEach(function() {
        testData = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be once in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send duplicate msg', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(testData.pop()).to.equal(global.translate('alias.failed.add'))
            done()
          })
        }, 10)
      })
      it('should parse added alias in chat', function (done) {
        setTimeout(function () {
          alias.parse(null, testUser, '!test')
          setTimeout(function () {
            expect(testData.pop()).to.match(/^Usage:/)
            done()
          }, 100)
        }, 10)
      })
    })
    describe('parsing \'!alias add <command>  <alias>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!alias add alias  test')
          done()
        })
      })
      afterEach(function() {
        testData = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(testData.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!alias add <command> <alias> <something>\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          global.parser.parseCommands(testUser, '!alias add alias test something')
          done()
        })
      })
      afterEach(function() {
        testData = []
      })
      after(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({type: 'alias'}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(testData.pop()).to.match(/^Sorry,/)
      })
    })
  })
  describe('#remove', function () {
    describe('parsing \'!alias remove\'', function () {
      beforeEach(function (done) {
        global.parser.parseCommands(testUser, '!alias add alias test')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!alias remove')
          done()
        }, 100)
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(testData.pop()).to.match(/^Sorry,/)
      })
    })
    describe('parsing \'!alias remove alias\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          alias.add(alias, testUser, 'alias test')
          setTimeout(function () {
            global.parser.parseCommands(testUser, '!alias remove test')
            done()
          }, 100)
        })
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send success message', function (done) {
        setTimeout(function () {
          expect(testData.pop()).to.equal(global.translate('alias.success.remove'))
          done()
        }, 100)
      })
      it('should not parse in chat', function (done) {
        setTimeout(function () {
          alias.parse(null, testUser, '!test')
          setTimeout(function () {
            expect(testData.pop()).not.to.match(/^Usage:/)
            done()
          }, 90)
        }, 10)
      })
    })
    describe('parsing 2x sent \'!alias remove alias\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          alias.add(alias, testUser, 'alias test')
          setTimeout(function () {
            global.parser.parseCommands(testUser, '!alias remove test')
            global.parser.parseCommands(testUser, '!alias remove test')
            done()
          }, 100)
        })
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should not be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(0)
            done()
          })
        }, 10)
      })
      it('should send not found message', function (done) {
        setTimeout(function () {
          expect(testData.pop()).to.equal(global.translate('alias.failed.remove'))
          done()
        }, 100)
      })
      it('should not parse in chat', function (done) {
        setTimeout(function () {
          alias.parse(null, testUser, '!test')
          setTimeout(function () {
            expect(testData.pop()).not.to.match(/^Usage:/)
            done()
          }, 90)
        }, 10)
      })
    })
    describe('parsing \'!alias remove alias something\'', function () {
      beforeEach(function (done) {
        global.botDB.remove({}, {multi: true}, function () {
          alias.add(alias, testUser, 'alias test')
          setTimeout(function () {
            global.parser.parseCommands(testUser, '!alias remove test something')
            done()
          }, 100)
        })
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should be in db', function (done) {
        setTimeout(function () {
          global.botDB.count({$where: function () { return this._id.startsWith('alias') }}, function (err, count) {
            expect(count).to.equal(1)
            done()
          })
        }, 10)
      })
      it('should send parse error', function () {
        expect(testData.pop()).to.match(/^Sorry,/)
      })
    })
  })
  describe('#list', function () {
    describe('parsing \'!alias list\' when alias is added', function () {
      beforeEach(function (done) {
        global.parser.parseCommands(testUser, '!alias add alias test')
        global.parser.parseCommands(testUser, '!alias add alias test2')
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!alias list')
          done()
        }, 100)
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should send list with test and test2', function (done) {
        setTimeout(function () {
          expect(testData.pop()).to.equal('List of aliases: !test, !test2')
          done()
        }, 100)
      })
    })
    describe('parsing \'!alias list\' when list is empty', function () {
      beforeEach(function (done) {
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!alias list')
          done()
        }, 100)
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should send empty list', function (done) {
        setTimeout(function () {
          expect(testData.pop()).to.equal('List of aliases is empty')
          done()
        }, 100)
      })
    })
    describe('parsing \'!alias list nonsense\'', function () {
      beforeEach(function (done) {
        setTimeout(function () {
          global.parser.parseCommands(testUser, '!alias list nonsense')
          done()
        }, 100)
      })
      after(function (done) {
        testData = []
        global.botDB.remove({}, {multi: true}, function () {
          done()
        })
      })
      it('should send parse error', function () {
        expect(testData.pop()).to.match(/^Sorry,/)
      })
    })
  })
})
