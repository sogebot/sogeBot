/* global describe it beforeEach afterEach it */

const assert = require('chai').assert
const until = require('test-until')
const _ = require('lodash')
const sinon = require('sinon')
require('./general.js')

// users
const owner = { username: 'soge__' }
const testUser = { username: 'test', mod: true }
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
    describe('check()', () => {
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
        await until(() => spy.called, 5000)

        for (let args of spy.args) {
          assert.isTrue(args[1])
        }
        spy.reset()

        global.parser.parse(testUser, '!me')
        await until(() => spy.called, 5000)

        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        assert.isTrue(isFalse)
        spy.reset()

        global.parser.parse(testUser2, '!me')
        await until(() => spy.called, 5000)

        for (let args of spy.args) {
          assert.isTrue(args[1])
        }
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
        await until(() => spy.called, 5000)
        for (let args of spy.args) {
          assert.isTrue(args[1])
        }
        spy.reset()

        global.parser.parse(testUser, '!me')
        await until(() => spy.called, 5000)

        let isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        assert.isTrue(isFalse)
        spy.reset()

        global.parser.parse(testUser2, '!me')
        await until(() => spy.called, 5000)

        isFalse = false
        for (let args of spy.args) {
          if (!args[1]) isFalse = true
        }
        assert.isTrue(isFalse)

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
          await until(() => spy.called, 5000)

          for (let args of spy.args) {
            assert.isTrue(args[1])
          }
          spy.reset()

          global.parser.parse(testUser, '!me')
          await until(() => spy.called, 5000)

          for (let args of spy.args) {
            assert.isTrue(args[1])
          }
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

          global.parser.parse(testUser, '!me')
          await until(() => spy.called, 5000)

          for (let args of spy.args) {
            assert.isTrue(args[1])
          }
          spy.reset()

          global.parser.parse(testUser, '!me')
          await until(() => spy.called, 5000)

          let isFalse = false
          for (let args of spy.args) {
            if (!args[1]) isFalse = true
          }
          assert.isTrue(isFalse)
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
          await until(() => spy.called, 5000)

          for (let args of spy.args) {
            assert.isTrue(args[1])
          }
          spy.reset()

          global.parser.parse(owner, '!me')
          await until(() => spy.called, 5000)

          let isFalse = false
          for (let args of spy.args) {
            if (!args[1]) isFalse = true
          }
          assert.isTrue(isFalse)
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
