import Module from '../_interface.js';

class Integration extends Module {
  constructor() {
    super('integrations', false);
  }

  public scope (type?: 'read' | 'manage') {
    return super.scope(type, 'integrations');
  }
}

export default Integration;
