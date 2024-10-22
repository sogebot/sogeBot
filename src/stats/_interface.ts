import Module from '../_interface.js';

class Overlay extends Module {
  constructor() {
    super('stats', true);
  }

  public scope (type?: 'read' | 'manage') {
    return super.scope(type, 'stats');
  }
}

export default Overlay;
