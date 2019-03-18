/* global describe it before */

require('../../general.js')

const db = require('../../general.js').db
const message = require('../../general.js').message
const variable = require('../../general.js').variable

const assert = require('assert');

describe('lib/commons - flatten()', () => {
  it('Object with string should be correctly flatten', async () => {
    const object = { a: { b: { c: { d: { e: { f: 'lorem'}}}}}}
    assert.deepEqual(global.commons.flatten(object), { 'a.b.c.d.e.f': 'lorem' })
  })

  it('Object with array should be correctly flatten', async () => {
    const object = { a: { b: { c: { d: { e: { f: ['lorem', 'ipsum']}}}}}}
    assert.deepEqual(global.commons.flatten(object), { 'a.b.c.d.e.f': ['lorem', 'ipsum'] })
  })
})

describe('lib/commons - unflatten()', () => {
  it('Object with string should be correctly unflatten', async () => {
    const object = { a: { b: { c: { d: { e: { f: 'lorem'}}}}}}
    assert.deepEqual(global.commons.unflatten({ 'a.b.c.d.e.f': 'lorem' }), object)
  })

  it('Object with array should be correctly unflatten', async () => {
    const object = { a: { b: { c: { d: { e: { f: ['lorem', 'ipsum']}}}}}}
    assert.deepEqual(global.commons.unflatten({ 'a.b.c.d.e.f': ['lorem', 'ipsum'] }), object)
  })
})