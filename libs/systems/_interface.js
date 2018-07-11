const Module = require('../_interface')

class System extends Module {
  constructor (opts) {
    opts.name = 'systems'
    super(opts)
  }
}

module.exports = System
