const Module = require('../_interface')

class Game extends Module {
  constructor (opts) {
    opts = opts || {}
    opts.name = 'overlays'
    super(opts)

    this.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' })
  }
}

module.exports = Game
