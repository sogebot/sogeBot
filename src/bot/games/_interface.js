const Module = require('../_interface')

class Game extends Module {
  constructor (opts) {
    opts.name = 'games'
    super(opts)

    this.addMenu({category: 'settings', name: 'games', id: 'games'})
  }
}

module.exports = Game
