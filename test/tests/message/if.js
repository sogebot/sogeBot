/* global describe it beforeEach */
require('../../general.js')

const db = require('../../general.js').db
const msg = require('../../general.js').message
const Message = require('../../../dest/message')
const assert = require('chai').assert

describe('Message - if filter', () => {
  beforeEach(async () => {
    await db.cleanup()
    await msg.prepare()
  })

  describe('(if \'$!param\'==\'n/a\'| $sender (random.online.viewer) chosed | $sender and $param (random.number-1-to-100)%)', () => {
    let toParse = '(if \'$!param\'==\'n/a\'| $sender (random.online.viewer) chosed | $sender and $param (random.number-1-to-100)%)'

    it('Check true condition', async () => {
      let message = await new Message(toParse).parse({ param: 'n/a' })
      assert.isTrue(message === '$sender unknown chosed')
    })
    it('Check false condition', async () => {
      let message = await new Message(toParse).parse({ param: 'asd' })
      assert.isNotEmpty(message.match(/\$sender and asd \d{1,3}%/))
    })
  })
})
