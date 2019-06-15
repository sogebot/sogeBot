const XRegExp = require('xregexp')
const _ = require('lodash')
import { debug } from './debug';

class Expects {
  constructor (text) {
    if (text) {
      this.originalText = text
      this.text = text
    } else {
      this.originalText = ''
      this.text = ''
    }
    this.match = []
  }

  checkText (opts) {
    opts = opts || {}
    if (_.isNil(this.text)) throw Error('Text cannot be null')
    if (this.text.trim().length === 0) {
      if (opts.expects) {
        if (opts.name) {
          throw Error('Expected parameter <' + _.get(opts, 'name', '') + ':' + opts.expects + '> at position ' + this.match.length)
        } else {
          throw Error('Expected parameter <' + opts.expects + '> at position ' + this.match.length)
        }
      } else {
        throw Error('Expected parameter at position ' + this.match.length)
      }
    }
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
    _.defaults(opts, { optional: false, spaces: false })
    if (!opts.optional) this.checkText()

    const regexp = XRegExp('(?<command> ^!\\S* )', 'ix')
    const match = XRegExp.exec(this.text, regexp)

    debug('expects.command', JSON.stringify({text: this.text, opts, match}));
    if (!_.isNil(match)) {
      this.match.push(match.command.trim().toLowerCase())
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
    if (opts.all) regexp = XRegExp('(?<points> all|[0-9]+ )', 'ix')
    else regexp = XRegExp('(?<points> [0-9]+ )', 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      if (match.points === 'all') {
        this.match.push(match.points)
      } else {
        this.match.push(parseInt(
          Number(match.points) <= Number.MAX_SAFE_INTEGER
            ? match.points
            : Number.MAX_SAFE_INTEGER, 10)) // return only max safe
      }
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
    if (!opts.optional) this.checkText({
      expects: 'number',
      ...opts,
    })

    const regexp = XRegExp('(?<number> [0-9]+ )', 'ix')
    const match = XRegExp.exec(this.text, regexp)

    if (!_.isNil(match)) {
      this.match.push(Number(match.number))
      this.text = this.text.replace(match.number, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Number not found')
      else this.match.push(null)
    }
    return this
  }

  switch (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false, default: null })

    if (_.isNil(opts.name)) throw Error('Argument name must be defined')
    if (_.isNil(opts.values)) throw Error('Values must be defined')
    if (!opts.optional) this.checkText()

    const pattern = opts.values.join('|')

    const regexp = XRegExp(`-(?<${opts.name}>${pattern})`, 'ix')
    const match = XRegExp.exec(this.text, regexp)
    if (!_.isNil(match) && match[opts.name].trim().length !== 0) {
      this.match.push(match[opts.name])
      this.text = this.text.replace(match[0], '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Argument not found')
      else this.match.push(opts.default)
    }
    return this
  }

  /* Toggler is used for toggle true/false with argument
   *    !command -c => -c is true
   *    !command => -c is false
   */
  toggler (opts) {
    opts = opts || {}

    if (_.isNil(opts.name)) throw Error('Toggler name must be defined')

    const regexp = XRegExp(`-${opts.name}\\b`, 'ix')
    const match = XRegExp.exec(this.text, regexp)
    if (!_.isNil(match)) {
      this.match.push(true)
      this.text = this.text.replace(match[0], '') // remove from text matched pattern
    } else {
      this.match.push(false)
    }
    return this
  }

  permission(opts) {
    opts = {
      optional: false,
      default: null,
      name: 'p', // default use -p
      ...opts
    }
    if (_.isNil(opts.name)) {
      throw Error('Permission name must be defined')
    }
    if (opts.optional && opts.default === null) {
      throw Error('Permission cannot be optional without default value')
    }

    const pattern = `([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})|(?:(?!-[a-zA-Z]).)+` // capture until -something or [^-]*
    const fullPattern = `-${opts.name}\\s(?<${opts.name}>${pattern})`
    const regexp = XRegExp(fullPattern, 'ix')
    const match = XRegExp.exec(this.text, regexp)

    debug('expects.permission', JSON.stringify({fullPattern, text: this.text, opts, match}));
    if (!_.isNil(match) && match[opts.name].trim().length !== 0) {
      this.match.push(String(match[opts.name].trim()))
      this.text = this.text.replace(match[0], '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error(`Permission ${opts.name} not found`)
      else this.match.push(opts.default)
    }
    return this
  }

  argument (opts) {
    opts = opts || {}
    _.defaults(opts, {
      type: String,
      optional: false,
      default: null,
      multi: false,
      delimiter: '"',
    })
    if (!opts.multi) opts.delimiter = ''
    opts.delimiter = XRegExp.escape(opts.delimiter)

    if (_.isNil(opts.name)) throw Error('Argument name must be defined')
    if (!opts.optional) this.checkText()

    let pattern
    if (opts.type.name === 'Number') pattern = '[0-9]*'
    else if (opts.type.name === 'Boolean') pattern = 'true|false'
    else if (!opts.multi) pattern = '\\S+'
    else pattern = `(?:(?!-[a-zA-Z]).)+${opts.delimiter !== '' ? '?' : ''}` // capture until -something or [^-]*

    const fullPattern = `-${opts.name}\\s${opts.delimiter}(?<${opts.name}>${pattern})${opts.delimiter}`
    const regexp = XRegExp(fullPattern, 'ix')
    const match = XRegExp.exec(this.text, regexp)

    debug('expects.argument', JSON.stringify({fullPattern, text: this.text, opts, match}));
    if (!_.isNil(match) && match[opts.name].trim().length !== 0) {
      if (opts.type.name === 'Boolean') {
        this.match.push(opts.type(match[opts.name].trim().toLowerCase() === 'true'))
      } else {
        this.match.push(opts.type(match[opts.name].trim()))
      }
      this.text = this.text.replace(match[0], '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error(`Argument ${opts.name} not found`)
      else this.match.push(opts.default)
    }
    return this
  }

  username (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false, default: null })
    if (!opts.optional) this.checkText()

    const regexp = XRegExp(`@?(?<username>[A-Za-z0-9_]+)`, 'ix')
    const match = XRegExp.exec(`${this.text}`, regexp)
    if (!_.isNil(match)) {
      this.match.push(match.username.toLowerCase())
      this.text = this.text.replace(match.username, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('Username not found')
      else this.match.push(opts.default)
    }
    return this
  }

  everything (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false })
    if (!opts.optional) this.checkText({
      expects: 'any',
      ...opts,
    })

    const regexp = XRegExp(`(?<everything> .* )`, 'ix')
    const match = XRegExp.exec(` ${this.text} `, regexp)
    if (!_.isNil(match)) {
      this.match.push(match.everything.substring(1, match.everything.length - 1).trim())
      this.everything = this.text.replace(match.everything, '') // remove from text matched pattern
    } else {
      if (!opts.optional) throw Error('There is no text found.')
      else this.match.push(null)
    }
    return this
  }

  string (opts) {
    opts = opts || {}
    _.defaults(opts, { optional: false })
    if (!opts.optional) this.checkText({
      expects: 'string',
      ...opts,
    })

    const regexp = XRegExp(`(?<string> \\S* )`, 'igx')
    const match = XRegExp.exec(`${this.text.trim()}`, regexp)
    if (!_.isNil(match)) {
      this.match.push(match.string.trim())
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
export default Expects
