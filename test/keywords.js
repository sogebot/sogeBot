/* global describe it beforeEach */

const assert = require('chai').assert
const until = require('test-until')
const crypto = require('crypto')
const sinon = require('sinon')
require('./general.js')

// users
const owner = { username: 'soge__' }

// load up a bot
require('../main.js')

describe('System - Keywords', () => {
  beforeEach(async () => {
    global.commons.sendMessage.reset()

    let items = await global.db.engine.find('keywords')
    for (let item of items) {
      await global.db.engine.remove('keywords', { keyword: item.keyword })
    }
    items = await global.db.engine.find('settings')
    for (let item of items) {
      await global.db.engine.remove('settings', { key: item.key })
    }
  })
  describe('#fnc', () => {
    describe('add()', () => {
      it('text: /empty/', async () => {
        global.systems.keywords.add(global.systems.keywords, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.failed.parse'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('keywords', { text: '' })
        assert.empty(item)
      })
      it('text: me Lorem Ipsum', async () => {
        global.systems.keywords.add(global.systems.keywords, owner, `me Lorem Ipsum`)
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.add').replace(/\$keyword/g, 'me'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('keywords', { keyword: 'me' })
        assert.notEmpty(item)
        assert.equal(item.response, 'Lorem Ipsum')

        global.parser.parse(owner, `Lorem me Ipsum`)
        await until(() => global.commons.sendMessage.withArgs('Lorem Ipsum'), 5000)
      })
    })
    describe('list()', () => {
      it('list: /empty/', async () => {
        global.systems.keywords.list(global.systems.keywords, owner)
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.failed.list'), sinon.match(owner)), 5000)
      })
      it('list: /not empty/', async () => {
        let id1 = crypto.randomBytes(4).toString('hex')
        global.systems.keywords.add(global.systems.keywords, owner, id1 + ' Lorem Ipsun')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.add').replace(/\$keyword/g, id1), sinon.match(owner)), 5000)
        global.commons.sendMessage.reset()

        let id2 = crypto.randomBytes(4).toString('hex')
        global.systems.keywords.add(global.systems.keywords, owner, id2 + ' Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.add').replace(/\$keyword/g, id2), sinon.match(owner)), 5000)

        global.systems.keywords.list(global.systems.keywords, owner)
        await until(() =>
          global.commons.sendMessage.calledWith(
            global.translate('keywords.success.list').replace(/\$list/g, `${id1}, ${id2}`), sinon.match(owner)) ||
          global.commons.sendMessage.calledWith(
            global.translate('keywords.success.list').replace(/\$list/g, `${id2}, ${id1}`), sinon.match(owner)), 5000)
      })
    })
    describe('toggle()', () => {
      it('text: /empty/', async () => {
        global.systems.keywords.toggle(global.systems.keywords, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.failed.parse'), sinon.match(owner)), 5000)
      })
      it('keywords: /incorrect keywords/', async () => {
        global.systems.keywords.toggle(global.systems.keywords, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('keywords.failed.toggle')
            .replace(/\$keyword/g, 'asdasd'), sinon.match(owner)), 5000)
      })
      it('text: /correct keywords/', async () => {
        let id = crypto.randomBytes(4).toString('hex')
        global.systems.keywords.add(global.systems.keywords, owner, `${id} Lorem Ipsum`)
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.add').replace(/\$keyword/g, id), sinon.match(owner)), 5000)

        await global.systems.keywords.toggle(global.systems.keywords, owner, `${id}`)
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('keywords.success.disabled')
          .replace(/\$keyword/g, id), sinon.match(owner)), 5000)

        await global.systems.keywords.toggle(global.systems.keywords, owner, `${id}`)
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('keywords.success.enabled')
            .replace(/\$keyword/g, id), sinon.match(owner)), 5000)
      })
    })
    describe('remove()', () => {
      it('text: /empty/', async () => {
        global.systems.keywords.remove(global.systems.keywords, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.failed.parse'), sinon.match(owner)), 5000)
      })
      it('text: /incorrect id/', async () => {
        global.systems.keywords.remove(global.systems.keywords, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.failed.remove').replace(/\$keyword/g, 'asdasd'), sinon.match(owner)), 5000)
      })
      it('text: /correct id/', async () => {
        let id = crypto.randomBytes(4).toString('hex')
        global.systems.keywords.add(global.systems.keywords, owner, `${id} Lorem Ipsum`)
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.add').replace(/\$keyword/g, id), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('keywords', { keyword: id })
        assert.isNotEmpty(item)

        await global.systems.keywords.remove(global.systems.keywords, owner, `${id}`)
        await until(() => global.commons.sendMessage.calledWith(global.translate('keywords.success.remove').replace(/\$keyword/g, id), sinon.match(owner)), 5000)
        assert.isFalse(global.parser.isRegistered(id))
      })
    })
  })
})
