/* global describe it beforeEach afterEach */

const fs = require('fs')
const assert = require('chai').assert
const until = require('test-until')
const _ = require('lodash')
require('mocha-sinon')

// setup config
const config = require('../config.json')
config.settings.bot_owners = 'soge__'
config.settings.broadcaster_username = 'soge__'
fs.writeFileSync('../config.json', JSON.stringify(config))

// users
const owner = { username: 'soge__' }

// load up a bot
require('../main.js')

describe('System - Alias', () => {
  beforeEach(async function () {
    this.sinon.stub(global.commons, 'sendMessage')
  })
  afterEach(async function () {
    let items = await global.db.engine.find('alias')
    _.each(items, async (item) => {
      await global.db.engine.remove('alias', { _id: item._id })
    })
    items = await global.db.engine.find('settings')
    _.each(items, async (item) => {
      await global.db.engine.remove('settings', { _id: item._id })
    })
  })
  describe('#fnc', () => {
    describe('add()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('alias', { text: '' })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('alias.failed.parse'))
        assert.empty(item)
      })
      it('text: !mee !me', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!mee !me')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('alias', { alias: 'mee' })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('core.isRegistered').replace(/\$keyword/g, '!me'))
        assert.empty(item)
      })
      it('text: !uptime !mee', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !mee')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('alias', { alias: 'mee' })

        assert.equal(global.commons.sendMessage.getCall(0).args[0], global.translate('alias.success.add'))
        assert.notEmpty(item)
        assert.equal(item.alias, 'mee')
        assert.equal(item.command, 'uptime')

        global.commons.sendMessage.reset()
        global.parser.parse(owner, '!mee')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.isTrue(global.commons.sendMessage.getCall(0).args[0].startsWith('Stream is'))
      })
    })
    describe('list()', () => {
      it('list: /empty/', async () => {
        global.systems.alias.list(global.systems.alias, owner)
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('alias.failed.list'))
      })
      it('list: /not empty/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!mee !test')
        global.systems.alias.add(global.systems.alias, owner, '!meee !test')
        global.systems.alias.list(global.systems.alias, owner)
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.isTrue(global.commons.sendMessage.thirdCall.args[0].startsWith(
          global.translate('alias.success.list')))
      })
    })
    describe('toggle()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.toggle(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('alias.failed.parse'))
      })
      it('alias: /incorrect alias/', async () => {
        global.systems.alias.toggle(global.systems.alias, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('alias.failed.toggle')
            .replace(/\$alias/g, 'asdasd'))
      })
      it('text: /correct alias/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !meee')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        await global.systems.alias.toggle(global.systems.alias, owner, '!meee')
        await global.systems.alias.toggle(global.systems.alias, owner, '!meee')
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('alias.success.disabled')
            .replace(/\$alias/g, 'meee'))
        assert.equal(global.commons.sendMessage.thirdCall.args[0],
          global.translate('alias.success.enabled')
            .replace(/\$alias/g, 'meee'))
      })
    })
    describe('visible()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.visible(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('alias.failed.parse'))
      })
      it('alias: /incorrect alias/', async () => {
        global.systems.alias.visible(global.systems.alias, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('alias.failed.visible')
            .replace(/\$alias/g, 'asdasd'))
      })
      it('text: /correct alias/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !time')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        await global.systems.alias.visible(global.systems.alias, owner, '!time')
        await global.systems.alias.visible(global.systems.alias, owner, '!time')
        await until(() => global.commons.sendMessage.calledThrice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('alias.success.invisible')
            .replace(/\$alias/g, 'time'))
        assert.equal(global.commons.sendMessage.thirdCall.args[0],
          global.translate('alias.success.visible')
            .replace(/\$alias/g, 'time'))
      })
    })
    describe('remove()', () => {
      it('text: /empty/', async () => {
        global.systems.alias.remove(global.systems.alias, owner, '')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('alias.failed.parse'))
      })
      it('text: /incorrect id/', async () => {
        global.systems.alias.remove(global.systems.alias, owner, '!asdasd')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        assert.equal(global.commons.sendMessage.getCall(0).args[0],
          global.translate('alias.failed.remove'))
      })
      it('text: /correct id/', async () => {
        global.systems.alias.add(global.systems.alias, owner, '!uptime !timetime')
        await until(() => global.commons.sendMessage.calledOnce, 5000)
        let item = await global.db.engine.findOne('alias', { alias: 'timetime' })
        assert.isNotEmpty(item)

        await global.systems.alias.remove(global.systems.alias, owner, '!timetime')
        await until(() => global.commons.sendMessage.calledTwice, 5000)
        assert.equal(global.commons.sendMessage.secondCall.args[0],
          global.translate('alias.success.remove'))
      })
    })
  })
})
