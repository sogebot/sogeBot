/* global describe it beforeEach */

const assert = require('chai').assert
const until = require('test-until')
const sinon = require('sinon')
require('./general.js')

// users
const owner = { username: 'soge__' }

describe.only('System - Alias', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()

    let items = await global.db.engine.find('alias')
    for (let item of items) {
      await global.db.engine.remove('alias', { alias: item.alias })
      global.parser.unregister(item.alias)
    }
    items = await global.db.engine.find('settings')
    for (let item of items) {
      await global.db.engine.remove('settings', { key: item.key })
    }
  })
  describe('#fnc', () => {
    describe('add()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.parse'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('alias', { text: '' })
        assert.empty(item)
      })
      it('text: !mee !me', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!mee !me')
        await until(() => global.commons.sendMessage.calledWith(global.translate('core.isRegistered').replace(/\$keyword/g, '!me'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('alias', { alias: 'mee' })
        assert.empty(item)
      })
      it('text: !uptime !mee', async () => {
        await global.systems.alias.add(global.systems.alias, owner, '!uptime !mee')

        await until(setError => {
          let expected = global.commons.prepare('alias.success.add', { alias: 'mee' })
          try {
            assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(owner)))
            return true
          } catch (err) {
            return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
          }
        })

        let item = await global.db.engine.findOne('alias', { alias: 'mee' })
        assert.notEmpty(item)
        assert.equal(item.alias, 'mee')
        assert.equal(item.command, 'uptime')

        // force uptime to be 0 (bypass cached db)
        global.twitch.when.online = null
        global.twitch.when.offline = null
        global.parser.parse(owner, '!mee')

        await until(setError => {
          let expected = 'Stream is currently offline for '
          try {
            assert.isTrue(global.commons.sendMessage.calledWith(expected, sinon.match(owner)))
            return true
          } catch (err) {
            return setError('\nExpected message: ' + expected + '\nActual message: ' + global.commons.sendMessage.lastCall.args[0])
          }
        })
      })
    })
    describe('list()', () => {
      it('list: /empty/', async () => {
        global.systems.alias.list(global.systems.alias, owner)
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.list'), sinon.match(owner)), 5000)
      })
      it('list: /not empty/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!mee !test1')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add').replace(/\$alias/g, 'test1'), sinon.match(owner)), 5000)
        global.commons.sendMessage.reset()

        global.systems.alias.add(global.systems.alias, owner, '!meee !test2')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add').replace(/\$alias/g, 'test2'), sinon.match(owner)), 5000)
        global.systems.alias.list(global.systems.alias, owner)
        await until(() =>
          global.commons.sendMessage.calledWith(
            global.translate('alias.success.list').replace(/\$list/g, '!test1, !test2'), sinon.match(owner)) ||
          global.commons.sendMessage.calledWith(
            global.translate('alias.success.list').replace(/\$list/g, '!test2, !test1'), sinon.match(owner)), 5000)
      })
    })
    describe('toggle()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.toggle(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.parse'), sinon.match(owner)), 5000)
      })
      it('alias: /incorrect alias/', async () => {
        global.systems.alias.toggle(global.systems.alias, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('alias.failed.toggle')
            .replace(/\$alias/g, 'asdasd'), sinon.match(owner)), 5000)
      })
      it('text: /correct alias/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !meee')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add').replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)

        await global.systems.alias.toggle(global.systems.alias, owner, '!meee')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('alias.success.disabled')
            .replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)

        await global.systems.alias.toggle(global.systems.alias, owner, '!meee')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('alias.success.enabled')
            .replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)
      })
    })
    describe('visible()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.visible(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.parse'), sinon.match(owner)), 5000)
      })
      it('alias: /incorrect alias/', async () => {
        global.systems.alias.visible(global.systems.alias, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('alias.failed.visible')
            .replace(/\$alias/g, 'asdasd'), sinon.match(owner)), 5000)
      })
      it('text: /correct alias/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !meee')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add').replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)

        await global.systems.alias.visible(global.systems.alias, owner, '!meee')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('alias.success.invisible')
            .replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)

        await global.systems.alias.visible(global.systems.alias, owner, '!meee')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('alias.success.visible')
            .replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)
      })
    })
    describe('remove()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.remove(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.parse'), sinon.match(owner)), 5000)
      })
      it('text: /incorrect id/', async () => {
        global.systems.alias.remove(global.systems.alias, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.remove').replace(/\$alias/g, 'asdasd'), sinon.match(owner)), 5000)
      })
      it('text: /correct id/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !meee')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add').replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)
        let item = await global.db.engine.findOne('alias', { alias: 'meee' })
        assert.isNotEmpty(item)

        await global.systems.alias.remove(global.systems.alias, owner, '!meee')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.remove').replace(/\$alias/g, 'meee'), sinon.match(owner)), 5000)

        assert.isFalse(global.parser.isRegistered('!meee'))
      })
    })
  })
})
