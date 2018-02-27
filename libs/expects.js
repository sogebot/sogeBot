const XRegExp = require('xregexp')
const _ = require('lodash')

class Expects {
  constructor () {
    this.originalText = null
    this.text = null
    this.match = []
  }

  checkText () {
    if (_.isNil(this.text)) throw Error('Text cannot be null')
    if (this.text.trim().length === 0) throw Error('Expected more parameters')
    this.text = this.text.trim()
  }

  check (text) {
    this.originalText = text
    this.text = text
    return this
  }

  toArray () {
    return this.match
  }

  command () {
    this.checkText()

    const regexp = XRegExp(`(?<command> ![\\pL0-9]* )`, 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      this.match.push(match.command)
      this.text = this.text.replace(match.command, '') // remove from text matched pattern
    } else throw Error(`Command not found`)
    return this
  }

  points () {
    this.checkText()

    const regexp = XRegExp(`(?<points> all|[0-9]* )`, 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      this.match.push(match.points)
      this.text = this.text.replace(match.points, '') // remove from text matched pattern
    } else throw Error(`Points not found`)
    return this
  }
}

module.exports = Expects
