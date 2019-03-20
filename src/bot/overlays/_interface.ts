import Module from '../_interface';

class Overlay extends Module {
  constructor(opts) {
    opts = opts || {};
    super(opts, 'overlays');
    this.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' });
  }
}

export default Overlay;
