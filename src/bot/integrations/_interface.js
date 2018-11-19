const Module = require('../_interface')

class Integration extends Module {
  constructor (opts) {
    opts.name = 'integrations'
    opts.settings.enabled = typeof opts.settings.enabled !== 'undefined' ? opts.settings.enabled : false
    super(opts)

    this.addMenu({ category: 'settings', name: 'integrations', id: 'integrations' })
  }
}

module.exports = Integration
