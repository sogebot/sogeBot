import Module from '../_interface';

class Game extends Module {
  constructor (opts) {
    opts.name = 'games'
    opts.settings.enabled = typeof opts.settings.enabled !== 'undefined' ? opts.settings.enabled : false
    super(opts)

    this.addMenu({ category: 'settings', name: 'games', id: 'games' })
  }
}

export default Game;