import Module from '../_interface';

class Overlay extends Module {
  constructor (opts) {
    opts = opts || {}
    opts.name = 'overlays'
    super(opts)

    this.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' })
  }
}

export default Overlay;
