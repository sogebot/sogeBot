'use strict'

const _ = require('lodash')
const debug = require('debug')

var timeouts = {}

const DEBUG_RECURSIVE = debug('timeout:recursive')

class Timeout {
  clear (uid) {
    if (!_.isNil(timeouts[uid])) {
      clearTimeout(timeouts[uid])
      delete timeouts[uid]
    }
  }

  recursive (opts) {
    if (_.isNil(opts.uid)) throw new Error('Uid must be defined')
    if (_.isNil(opts.wait)) throw new Error('Wait must be defined')
    if (_.isNil(opts.fnc)) throw new Error('Function must be defined')
    if (_.isNil(opts.args)) opts.args = []
    if (!_.isArray(opts.args)) opts.args = [opts.args]

    DEBUG_RECURSIVE(opts.uid)
    DEBUG_RECURSIVE(opts.args)

    this.clear(opts.uid)
    timeouts[opts.uid] = setTimeout(() => { opts['fnc'].apply(opts.this, opts.args) }, opts.wait)
  }
}

module.exports = Timeout
