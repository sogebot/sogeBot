/* global describe it before */

const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()



require('../../general.js')

const assert = require('assert')
const db = require('../../general.js').db
const message = require('../../general.js').message
const time = require('../../general.js').time
const _ = require('lodash')

describe('Database - lookup', () => {
  before(async () => {
    await db.cleanup()
    await message.prepare()

    await global.db.engine.remove('lookup', {})
    await global.db.engine.remove('lookup2', {})

    await global.db.engine.insert('lookup', { id: 1, name: 'lookup1' })
    await global.db.engine.insert('lookup', { id: 2, name: 'lookup2' })
    await global.db.engine.insert('lookup', { id: 3, name: 'lookup3' })

    await global.db.engine.insert('lookup2', { lookupId: 1, value: 'lookup1' })
    await global.db.engine.insert('lookup2', { lookupId: 1, value: 'lookup11' })
    await global.db.engine.insert('lookup2', { lookupId: 2, value: 'lookup2' })
    await global.db.engine.insert('lookup2', { lookupId: 3, value: 'lookup3' })
  })

  describe('find() - without lookup', function () {
    let items = null;

    it('find with lookup', async() => {
      items = await global.db.engine.find('lookup', {})
    })

    it('check if correct dataset is returned', function () {
      for (const i of items) {
        assert.strictEqual(i.name, 'lookup' + i.id)
        assert.strictEqual(i.lookup2, undefined);
      }
    })
  })

  describe('find() - lookup as array', function () {
    let items = null;

    it('find with lookup', async() => {
      items = await global.db.engine.find('lookup', {}, [
        { from: 'lookup2', localField: 'id', foreignField: 'lookupId', as: 'lookup2' }
      ])
    })

    it('check if correct dataset is returned', function () {
      for (const i of items) {
        assert.strictEqual(i.name, 'lookup' + i.id)
        switch (i.id) {
          case 1:
            assert.strictEqual(i.lookup2.length, 2, 'Length of attribute lookup2 expected to be 2');
            for (const l of i.lookup2) {
              assert.ok(['lookup1', 'lookup11'].includes(l.value))
              assert.strictEqual(l.lookupId, 1)
            }
            break;
          case 2:
            assert.strictEqual(i.lookup2.length, 1, 'Length of attribute lookup2 expected to be 1');
            for (const l of i.lookup2) {
              assert.ok(['lookup2'].includes(l.value))
              assert.strictEqual(l.lookupId, 2)
            }
            break;
          case 3:
            assert.strictEqual(i.lookup2.length, 1, 'Length of attribute lookup2 expected to be 1');
            for (const l of i.lookup2) {
              assert.ok(['lookup3'].includes(l.value))
              assert.strictEqual(l.lookupId, 3)
            }
            break;
        }
      }
    })
  })

  describe('find() - lookup as object', function () {
    let items = null;

    it('find with lookup', async() => {
      items = await global.db.engine.find('lookup', {},
        { from: 'lookup2', localField: 'id', foreignField: 'lookupId', as: 'lookup2' }
      )
    })

    it('check if correct dataset is returned', function () {
      for (const i of items) {
        assert.strictEqual(i.name, 'lookup' + i.id)
        switch (i.id) {
          case 1:
            assert.strictEqual(i.lookup2.length, 2, 'Length of attribute lookup2 expected to be 2');
            for (const l of i.lookup2) {
              assert.ok(['lookup1', 'lookup11'].includes(l.value))
              assert.strictEqual(l.lookupId, 1)
            }
            break;
          case 2:
            assert.strictEqual(i.lookup2.length, 1, 'Length of attribute lookup2 expected to be 1');
            for (const l of i.lookup2) {
              assert.ok(['lookup2'].includes(l.value))
              assert.strictEqual(l.lookupId, 2)
            }
            break;
          case 3:
            assert.strictEqual(i.lookup2.length, 1, 'Length of attribute lookup2 expected to be 1');
            for (const l of i.lookup2) {
              assert.ok(['lookup3'].includes(l.value))
              assert.strictEqual(l.lookupId, 3)
            }
            break;
        }
      }
    })
  })

  describe('findOne() - without lookup', function () {
    let item = null;

    it('find with lookup', async() => {
      item = await global.db.engine.findOne('lookup', { name: 'lookup1'})
    })

    it('check if correct dataset is returned', function () {
      assert.strictEqual(item.name, 'lookup1')
      assert.strictEqual(item.lookup2, undefined);
    })
  })

  describe('findOne() - lookup as array', function () {
    let item = null;

    it('findOne with lookup', async() => {
      item = await global.db.engine.findOne('lookup', { name: 'lookup1' }, [
        { from: 'lookup2', localField: 'id', foreignField: 'lookupId', as: 'lookup2' }
      ])
    })

    it('check if correct dataset is returned', function () {
      assert.strictEqual(item.name, 'lookup1')
      assert.strictEqual(item.lookup2.length, 2, 'Length of attribute lookup2 expected to be 2');
      for (const l of item.lookup2) {
        assert.ok(['lookup1', 'lookup11'].includes(l.value))
        assert.strictEqual(l.lookupId, 1)
      }
    })
  })

  describe('findOne() - lookup as object', function () {
    let item = null;

    it('findOne with lookup', async() => {
      item = await global.db.engine.findOne('lookup', { name: 'lookup1' },
        { from: 'lookup2', localField: 'id', foreignField: 'lookupId', as: 'lookup2' }
      )
    })

    it('check if correct dataset is returned', function () {
      assert.strictEqual(item.name, 'lookup1')
      assert.strictEqual(item.lookup2.length, 2, 'Length of attribute lookup2 expected to be 2');
      for (const l of item.lookup2) {
        assert.ok(['lookup1', 'lookup11'].includes(l.value))
        assert.strictEqual(l.lookupId, 1)
      }
    })
  })
})
