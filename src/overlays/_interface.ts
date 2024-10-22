import Module from '../_interface.js';

class Overlay extends Module {
  constructor() {
    super('overlays', true);
  }

  public scope (type?: 'read' | 'manage') {
    return super.scope(type, 'overlay');
  }
}

export default Overlay;
