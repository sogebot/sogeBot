const Module = require('../_interface')

class Game extends Module {
  constructor (opts) {
    opts.name = 'games'
    super(opts)
  }
}

module.exports = Game
