/* global describe it beforeEach afterEach */

const assert = require('chai').assert
const until = require('test-until')
const sinon = require('sinon')
require('./general.js')

// users
const owner = { username: 'soge__' }

describe('System - Alias', () => {
  beforeEach(() => {
    global.commons.sendMessage.reset()
  })
  afterEach(async function () {
    let items = await global.db.engine.find('alias')
    for (let item of items) {
      await global.db.engine.remove('alias', { _id: item._id })
    }
    items = await global.db.engine.find('settings')
    for (let item of items) {
      await global.db.engine.remove('settings', { _id: item._id })
    }
    global.parser.unregister('!meee')
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
        global.systems.alias.add(global.systems.alias, owner, '!uptime !mee')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('alias', { alias: 'mee' })
        assert.notEmpty(item)
        assert.equal(item.alias, 'mee')
        assert.equal(item.command, 'uptime')

        global.commons.sendMessage.reset()
        global.parser.parse(owner, '!mee')
        await until(() => global.commons.sendMessage.calledWith('Stream is currently offline for ', sinon.match(owner)), 5000)
      })
    })
    describe('list()', () => {
      it('list: /empty/', async () => {
        global.systems.alias.list(global.systems.alias, owner)
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.list'), sinon.match(owner)), 5000)
      })
      it('list: /not empty/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!mee !test1')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add'), sinon.match(owner)), 5000)
        global.commons.sendMessage.reset()

        global.systems.alias.add(global.systems.alias, owner, '!meee !test2')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add'), sinon.match(owner)), 5000)

        global.systems.alias.list(global.systems.alias, owner)
        await until(() =>
          global.commons.sendMessage.calledWith(
            global.translate('alias.success.list') + ': !test1, !test2', sinon.match(owner)) ||
          global.commons.sendMessage.calledWith(
            global.translate('alias.success.list') + ': !test2, !test1', sinon.match(owner)), 5000)
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
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add'), sinon.match(owner)), 5000)

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
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add'), sinon.match(owner)), 5000)

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
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.failed.remove'), sinon.match(owner)), 5000)
      })
      it('text: /correct id/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !meee')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.add'), sinon.match(owner)), 5000)
        let item = await global.db.engine.findOne('alias', { alias: 'meee' })
        assert.isNotEmpty(item)

        await global.systems.alias.remove(global.systems.alias, owner, '!meee')
        await until(() => global.commons.sendMessage.calledWith(global.translate('alias.success.remove'), sinon.match(owner)), 5000)

        assert.isFalse(global.parser.isRegistered('!meee'))
      })
    })
  })
})
