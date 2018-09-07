const XRegExp = require('xregexp')
const _ = require('lodash')

class Expects {
  constructor (text) {
    if (text) {
      this.originalText = text
      this.text = text
    } else {
      this.originalText = null
      this.text = null
    }
    this.match = []
  }

  checkText () {
    if (_.isNil(this.text)) throw Error('Text cannot be null')
    if (this.text.trim().length === 0) throw Error('Expected more parameters')
    this.text = this.text.replace(/\s\s+/g, ' ').trim()
  }

  check (text) {
    console.warn('Calling deprecated function check(), set in constructor directly')
    console.warn(new Error().stack)
    this.originalText = text
    this.text = text
    return this
  }

  toArray () {
    return this.match
  }

  command (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false })
    if (!opts.optional) this.checkText()

    const regexp = XRegExp('(?<command> ^![\\pL0-9]* )', 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      this.match.push(match.command)
      this.text = this.text.replace(match.command, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Command not found')
      else this.match.push(null)
    }
    return this
  }

  points (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false, all: false })
    if (!opts.optional) this.checkText()

    let regexp
    if (opts.all) regexp = XRegExp('(?<points> all|[0-9]* )', 'ix')
    else regexp = XRegExp('(?<points> [0-9]* )', 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      this.match.push(parseInt(
        Number(match.points) <= Number.MAX_SAFE_INTEGER / 1000000
          ? match.points
          : Number.MAX_SAFE_INTEGER / 1000000, 10)) // return only max safe
      this.text = this.text.replace(match.points, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Points not found')
      else this.match.push(null)
    }
    return this
  }

  number (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false })
    if (!opts.optional) this.checkText()

    const regexp = XRegExp('(?<number> [0-9]+ )', 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      this.match.push(match.number)
      this.text = this.text.replace(match.number, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Number not found')
      else this.match.push(null)
    }
    return this
  }

  argument (opts) {
    opts = opts || {}
    _.defaults(opts, { type: String, optional: false, default: null, multi: false, delimiter: '"' })
    opts.delimiter = XRegExp.escape(opts.delimiter)
    if (!opts.multi) opts.delimiter = ''

    if (_.isNil(opts.name)) throw Error('Argument name must be defined')
    if (!opts.optional) this.checkText()

    let pattern
    if (opts.type.name === 'Number') pattern = '\\s[0-9]*'
    else if (opts.type.name === 'Boolean') pattern = '\\strue|false'
    else if (!opts.multi) pattern = '\\s\\w+'
    else pattern = '(?:(?!\\s-[a-zA-Z]).)*' // capture until -something or [^-]*

    const regexp = XRegExp(`-${opts.name}${opts.delimiter}(?<${opts.name}>${pattern})${opts.delimiter}`, 'ix')
    const match = XRegExp.exec(this.text, regexp)
    if (!_.isNil(match) && match[opts.name].trim().length !== 0) {
      if (opts.type.name === 'Boolean') {
        this.match.push(opts.type(match[opts.name].trim().toLowerCase() === 'true'))
      } else {
        this.match.push(opts.type(match[opts.name].trim()))
      }
      this.text = this.text.replace(match[0], '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Argument not found')
      else this.match.push(opts.default)
    }
    return this
  }

  username (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false })
    if (!opts.optional) this.checkText()

    const regexp = XRegExp(`@?(?<username>[A-Za-z0-9_]+)`, 'ix')
    const match = XRegExp.exec(`${this.text}`, regexp)
    if (!_.isNil(match)) {
      this.match.push(match.username)
      this.text = this.text.replace(match.username, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Username not found')
      else this.match.push(null)
    }
    return this
  }

  string (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false, delimiter: '\\s' })
    opts.delimiter = XRegExp.escape(opts.delimiter)
    if (!opts.optional) this.checkText()

    const regexp = XRegExp(`(?<string> .* )`, 'ix')
    const match = XRegExp.exec(` ${this.text} `, regexp)
    if (!_.isNil(match)) {
      this.match.push(match.string.substring(1, match.string.length - 1))
      this.text = this.text.replace(match.string, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('String not found')
      else this.match.push(null)
    }
    return this
  }

  list (opts) {
    _.defaults(opts, { optional: false, delimiter: ' ' })
    this.checkText()

    const regexp = XRegExp('(?<list> .*)', 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      this.match.push(match.list.split(opts.delimiter).map((o) => o.trim()))
      this.text = this.text.replace(match.list, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('List not found')
      else this.match.push([])
    }
    return this
  }
}

module.exports = Expects
