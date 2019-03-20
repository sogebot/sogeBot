import Module from '../_interface';

class Game extends Module {
  constructor (opts) {
    opts.settings.enabled = typeof opts.settings.enabled !== 'undefined' ? opts.settings.enabled : false
    super(opts, 'games')

    this.addMenu({ category: 'settings', name: 'games', id: 'games' })
  }
}

export default Game;