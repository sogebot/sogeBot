import Module from '../_interface';

class Overlay extends Module {
  constructor() {
    super('overlays', true);
    this.addMenu({ category: 'settings', name: 'overlays', id: '/settings/overlays' });
  }
}

export default Overlay;
