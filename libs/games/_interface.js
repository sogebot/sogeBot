const System = require('../systems/_interface')

class Game extends System {
  constructor (opts) {
    super(opts)
    this._name = 'games'
  }
}

module.exports = Game
