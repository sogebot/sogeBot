/* global describe it before beforeEach afterEach */

const assert = require('chai').assert
const until = require('test-until')
const sinon = require('sinon')
const _ = require('lodash')
require('./general.js')

// users
const owner = { username: 'soge__' }

describe('System - Notice', () => {
  beforeEach(function () {
    global.commons.sendMessage.reset()
  })
  afterEach(async function () {
    let items = await global.db.engine.find('notices')
    for (let item of items) {
      await global.db.engine.remove('notices', { key: item.key })
    }
    items = await global.db.engine.find('settings')
    for (let item of items) {
      await global.db.engine.remove('settings', { _id: item._id })
    }
  })
  describe('#fnc', () => {
    describe('add()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.add(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.failed.parse'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('notices', { text: '' })
        assert.empty(item)
      })
      it('text: Lorem Ipsum', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.add'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })
        assert.notEmpty(item)
        assert.equal(item.text, 'Lorem Ipsum')
      })
    })
    describe('list()', () => {
      it('list: /empty/', async () => {
        global.systems.notice.list(global.systems.notice, owner)
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.failed.list'), sinon.match(owner)), 5000)
      })
      it('list: /not empty/', async () => {
        global.commons.sendMessage.reset()
        global.systems.notice.add(global.systems.notice, owner, 'test 1')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.add'), sinon.match(owner)), 5000)
        global.commons.sendMessage.reset()

        global.systems.notice.add(global.systems.notice, owner, 'test 2')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.add'), sinon.match(owner)), 5000)

        let notices = await global.db.engine.find('notices')
        global.systems.notice.list(global.systems.notice, owner)
        await until(() =>
          global.commons.sendMessage.calledWith(
            global.translate('notice.success.list') + ': ' + _.map(_.orderBy(notices, 'key'), 'key').join(', '), sinon.match(owner)), 5000)
      })
    })
    describe('get()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.get(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.failed.parse'), sinon.match(owner)), 5000)
      })
      it('text: /incorrect id/', async () => {
        global.systems.notice.get(global.systems.notice, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.failed.notFound'), sinon.match(owner)), 5000)
      })
      it('text: /correct id/', async () => {
        global.commons.sendMessage.reset()
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.add'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })
        assert.isNotEmpty(item)

        global.systems.notice.get(global.systems.notice, owner, item.key)
        await until(() => global.commons.sendMessage.calledWith('Notice#' + item.key + ': ' + item.text, sinon.match(owner)), 5000)
      })
    })
    describe('toggle()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.toggle(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.failed.parse'), sinon.match(owner)), 5000)
      })
      it('text: /incorrect id/', async () => {
        global.systems.notice.toggle(global.systems.notice, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('notice.failed.toggle')
            .replace(/\$notice/g, 'asdasd'), sinon.match(owner)), 5000)
      })
      it('text: /correct id/', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.add'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })
        assert.isNotEmpty(item)

        await global.systems.notice.toggle(global.systems.notice, owner, item.key)
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('notice.success.disabled')
            .replace(/\$notice/g, item.key), sinon.match(owner)), 5000)

        await global.systems.notice.toggle(global.systems.notice, owner, item.key)
        await until(() => global.commons.sendMessage.calledWith(
          global.translate('notice.success.disabled')
            .replace(/\$notice/g, item.key), sinon.match(owner)), 5000)
      })
    })
    describe('remove()', () => {
      it('text: /empty/', async () => {
        global.systems.notice.remove(global.systems.notice, owner, '')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.failed.parse'), sinon.match(owner)), 5000)
      })
      it('text: /incorrect id/', async () => {
        global.systems.notice.remove(global.systems.notice, owner, 'asdasd')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.failed.notFound'), sinon.match(owner)), 5000)
      })
      it('text: /correct id/', async () => {
        global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.add'), sinon.match(owner)), 5000)

        let item = await global.db.engine.findOne('notices', { text: 'Lorem Ipsum' })
        assert.isNotEmpty(item)

        await global.systems.notice.remove(global.systems.notice, owner, item.key)
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.remove'), sinon.match(owner)), 5000)
      })
    })
  })
  describe('#send', () => {
    describe('0min, 5msgs', () => {
      before(async function () {
        global.commons.sendMessage.reset()
        global.parser.parse(owner, '!set noticeInterval 0')
        global.parser.parse(owner, '!set noticeMsgReq 5')
        await global.systems.notice.add(global.systems.notice, owner, 'Lorem Ipsum')
        await until(() => global.commons.sendMessage.calledWith(global.translate('notice.success.add'), sinon.match(owner)), 5000)
      })
      it('sent twice after 10 messages', async () => {
        for (var i in _.range(5)) {
          global.parser.parse(owner, i)
        }
        await until(() => global.commons.sendMessage.calledWith('Lorem Ipsum', sinon.match(owner)), 5000)
        for (var j in _.range(5)) {
          global.parser.parse(owner, j)
        }
        await until(() => global.commons.sendMessage.calledWith('Lorem Ipsum', sinon.match(owner)), 5000)
      })
    })
  })
})
