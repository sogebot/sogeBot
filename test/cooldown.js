/* global describe it beforeEach afterEach it */

const assert = require('chai').assert
const until = require('test-until')
const _ = require('lodash')
const sinon = require('sinon')
require('./general.js')

// users
const owner = { username: 'soge__' }
const mod = { username: 'mod', mod: true }
const testUser = { username: 'test' }
const testUser2 = { username: 'test2' }

// load up a bot
require('../main.js')

describe('System - Cooldowns', () => {
  beforeEach(function () {
    global.commons.sendMessage.reset()
  })
  afterEach(async function () {
    let items = await global.db.engine.find('cooldowns')
    for (let item of items) {
      await global.db.engine.remove('cooldowns', { key: item.key })
    }
    items = await global.db.engine.find('keywords')
    for (let item of items) {
      await global.db.engine.remove('keywords', { key: item.key })
    }
  })
  describe('#fnc', () => {
    describe('set()', () => {
      it('text: /empty/', async () => {
        global.systems.cooldown.set(global.systems.cooldown, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.failed.parse'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: '' })
        assert.empty(item)
      })
      it('global', async () => {
        global.systems.cooldown.set(global.systems.cooldown, owner, '!me global 60 true')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
          .replace(/\$command/g, '!me')
          .replace(/\$type/g, 'global')
          .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: '!me' })
        assert.notEmpty(item)
      })
      it('user', async () => {
        global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
          .replace(/\$command/g, '!me')
          .replace(/\$type/g, 'user')
          .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: '!me' })
        assert.notEmpty(item)
      })
      it('unset', async () => {
        global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
          .replace(/\$command/g, '!me')
          .replace(/\$type/g, 'user')
          .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

        global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 0')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.unset')
          .replace(/\$command/g, '!me'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: '!me' })
        assert.empty(item)
      })
    })
    describe('check() command', () => {
      it('user', async () => {
        if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()

        global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
          .replace(/\$command/g, '!me')
          .replace(/\$type/g, 'user')
          .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: '!me' })
        assert.notEmpty(item)
        var spy = sinon.spy(global, 'updateQueue')
        global.parser.parse(testUser, '!me')
        await until(() => {
          if (spy.called) {
            let isTrue = true
            for (let args of spy.args) {
              if (!args[1]) isTrue = false
            }
            return isTrue
          }
          return false
        }, 5000)

        spy.reset()
        global.parser.parse(testUser, '!me')
        await until(() => {
          if (spy.called) {
            let isFalse = false
            for (let args of spy.args) {
              if (!args[1]) isFalse = true
            }
            return isFalse
          }
          return false
        }, 5000)
        spy.reset()

        global.parser.parse(testUser2, '!me')
        await until(() => {
          if (spy.called) {
            let isTrue = true
            for (let args of spy.args) {
              if (!args[1]) isTrue = false
            }
            return isTrue
          }
          return false
        }, 5000)
        spy.reset()
      })
      it('global', async () => {
        if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()

        global.systems.cooldown.set(global.systems.cooldown, owner, '!me global 60 true')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
          .replace(/\$command/g, '!me')
          .replace(/\$type/g, 'global')
          .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: '!me' })
        assert.notEmpty(item)

        var spy = sinon.spy(global, 'updateQueue')
        global.parser.parse(testUser, '!me')
        await until(() => {
          if (spy.called) {
            let isTrue = true
            for (let args of spy.args) {
              if (!args[1]) isTrue = false
            }
            return isTrue
          }
          return false
        }, 5000)
        spy.reset()

        global.parser.parse(testUser, '!me')
        await until(() => {
          if (spy.called) {
            let isFalse = false
            for (let args of spy.args) {
              if (!args[1]) isFalse = true
            }
            return isFalse
          }
          return false
        }, 5000)
        spy.reset()

        global.parser.parse(testUser2, '!me')
        await until(() => {
          if (spy.called) {
            let isFalse = false
            for (let args of spy.args) {
              if (!args[1]) isFalse = true
            }
            return isFalse
          }
          return false
        }, 5000)
        spy.reset()
        if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()
      })
    })
    describe('check() keyword', () => {
      it('user', async () => {
        if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()

        global.systems.keywords.add(global.systems.keywords, owner, 'me (!me)')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.add')), 5000)

        global.systems.cooldown.set(global.systems.cooldown, owner, 'me user 60 true')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
          .replace(/\$command/g, 'me')
          .replace(/\$type/g, 'user')
          .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: 'me' })
        assert.notEmpty(item)

        var spy = sinon.spy(global, 'updateQueue')
        global.parser.parse(testUser, 'me')
        await until(() => {
          if (spy.called) {
            let isTrue = true
            for (let args of spy.args) {
              if (!args[1]) isTrue = false
            }
            return isTrue
          }
          return false
        }, 5000)
        spy.reset()

        spy.reset()
        global.parser.parse(testUser, 'me')
        await until(() => {
          if (spy.called) {
            let isFalse = false
            for (let args of spy.args) {
              if (!args[1]) isFalse = true
            }
            return isFalse
          }
          return false
        }, 5000)
        spy.reset()

        global.parser.parse(testUser2, 'me')
        await until(() => {
          if (spy.called) {
            let isTrue = true
            for (let args of spy.args) {
              if (!args[1]) isTrue = false
            }
            return isTrue
          }
          return false
        }, 5000)
        spy.reset()
      })
      it('global', async () => {
        if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()

        global.systems.keywords.add(global.systems.keywords, owner, 'me (!me)')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.add')), 5000)

        global.systems.cooldown.set(global.systems.cooldown, owner, 'me global 60 true')
        await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
          .replace(/\$command/g, 'me')
          .replace(/\$type/g, 'global')
          .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('cooldowns', { key: 'me' })
        assert.notEmpty(item)

        var spy = sinon.spy(global, 'updateQueue')
        global.parser.parse(testUser, 'me')
        await until(() => {
          if (spy.called) {
            let isTrue = true
            for (let args of spy.args) {
              if (!args[1]) isTrue = false
            }
            return isTrue
          }
          return false
        }, 5000)
        spy.reset()

        global.parser.parse(testUser, 'me')
        await until(() => {
          if (spy.called) {
            let isFalse = false
            for (let args of spy.args) {
              if (!args[1]) isFalse = true
            }
            return isFalse
          }
          return false
        }, 5000)
        spy.reset()

        global.parser.parse(testUser2, 'me')
        await until(() => {
          if (spy.called) {
            let isFalse = false
            for (let args of spy.args) {
              if (!args[1]) isFalse = true
            }
            return isFalse
          }
          return false
        }, 5000)
        spy.reset()
        if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()
      })
    })
    describe('toggles', () => {
      describe('toggle()', () => {
        it('correct toggle', async () => {
          if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()
          var spy = sinon.spy(global, 'updateQueue')
          global.commons.sendMessage.reset()

          global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
            .replace(/\$command/g, '!me')
            .replace(/\$type/g, 'user')
            .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

          global.systems.cooldown.toggleEnabled(global.systems.cooldown, owner, '!me user')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.disabled')
            .replace(/\$command/g, '!me'), sinon.match(owner)), 5000)

          global.parser.parse(testUser, '!me')
          await until(() => {
            if (spy.called) {
              let isTrue = true
              for (let args of spy.args) {
                if (!args[1]) isTrue = false
              }
              return isTrue
            }
            return false
          }, 5000)
          spy.reset()

          global.parser.parse(testUser, '!me')
          await until(() => {
            if (spy.called) {
              let isTrue = true
              for (let args of spy.args) {
                if (!args[1]) isTrue = false
              }
              return isTrue
            }
            return false
          }, 5000)
          spy.reset()
        })
        it('incorrect toggle', async () => {
          global.commons.sendMessage.reset()

          global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
            .replace(/\$command/g, '!me')
            .replace(/\$type/g, 'user')
            .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

          global.systems.cooldown.toggleEnabled(global.systems.cooldown, owner, '!me')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.failed.parse'), sinon.match(owner)), 5000)
        })
      })
      describe('toggleModerators()', () => {
        it('correct toggle', async () => {
          // flush viewers cooldowns
          global.systems.cooldown.viewers = {}
          if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()

          var spy = sinon.spy(global, 'updateQueue')
          global.commons.sendMessage.reset()

          global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
            .replace(/\$command/g, '!me')
            .replace(/\$type/g, 'user')
            .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

          global.systems.cooldown.toggleModerators(global.systems.cooldown, owner, '!me user')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.toggle.moderator.enabled')
            .replace(/\$command/g, '!me'), sinon.match(owner)), 5000)

          global.parser.parse(mod, '!me')
          await until(() => {
            if (spy.called) {
              let isTrue = true
              for (let args of spy.args) {
                if (!args[1]) isTrue = false
              }
              return isTrue
            }
            return false
          }, 5000)
          spy.reset()

          global.parser.parse(mod, '!me')
          await until(() => {
            if (spy.called) {
              let isFalse = false
              for (let args of spy.args) {
                if (!args[1]) isFalse = true
              }
              return isFalse
            }
            return false
          }, 5000)
          spy.reset()
        })
        it('incorrect toggle', async () => {
          global.commons.sendMessage.reset()

          global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
            .replace(/\$command/g, '!me')
            .replace(/\$type/g, 'user')
            .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

          global.systems.cooldown.toggleModerators(global.systems.cooldown, owner, '!me')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.failed.parse'), sinon.match(owner)), 5000)
        })
      })
      describe('toggleOwners()', () => {
        it('correct toggle', async () => {
          // flush viewers cooldowns
          global.systems.cooldown.viewers = {}
          if (_.isFunction(global.updateQueue.restore)) global.updateQueue.restore()

          var spy = sinon.spy(global, 'updateQueue')
          global.commons.sendMessage.reset()

          global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
            .replace(/\$command/g, '!me')
            .replace(/\$type/g, 'user')
            .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

          global.systems.cooldown.toggleOwners(global.systems.cooldown, owner, '!me user')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.toggle.owner.enabled')
            .replace(/\$command/g, '!me'), sinon.match(owner)), 5000)

          global.parser.parse(owner, '!me')
          await until(() => {
            if (spy.called) {
              let isTrue = true
              for (let args of spy.args) {
                if (!args[1]) isTrue = false
              }
              return isTrue
            }
            return false
          }, 5000)
          spy.reset()

          global.parser.parse(owner, '!me')
          await until(() => {
            if (spy.called) {
              let isFalse = false
              for (let args of spy.args) {
                if (!args[1]) isFalse = true
              }
              return isFalse
            }
            return false
          }, 5000)
          spy.reset()
        })
        it('incorrect toggle', async () => {
          global.commons.sendMessage.reset()

          global.systems.cooldown.set(global.systems.cooldown, owner, '!me user 60 true')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.success.set')
            .replace(/\$command/g, '!me')
            .replace(/\$type/g, 'user')
            .replace(/\$seconds/g, '60'), sinon.match(owner)), 5000)

          global.systems.cooldown.toggleOwners(global.systems.cooldown, owner, '!me')
          await until(() => global.commons.sendMessage.calledWith(global.translate('cooldown.failed.parse'), sinon.match(owner)), 5000)
        })
      })
    })
  })
})
