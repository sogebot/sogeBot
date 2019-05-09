/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const msg = require('../../general.js').message
const Message = require('../../../dest/message')
const assert = require('chai').assert
const sinon = require('sinon')

describe('Message - api filter', () => {
  beforeEach(async () => {
    await db.cleanup()
    await msg.prepare()
  })

  describe('#1989 - ?test=a\\\\nb should be correctly parsed', () => {
    // we are using mock http://localhost/get?test=a\\nb

    let toParse = '(api|http://localhost/get?test=a\\nb) Lorem (api.test)'

    it('Expecting response Lorem a\\\\nb', async () => {
      let message = await new Message(toParse).parse({ })
      assert.isTrue(message === 'Lorem a\\nb')
    })
  })
})
