import Module from '../_interface.js';

import { addScope } from '~/helpers/socket.js';

class Integration extends Module {
  constructor() {
    super('integrations', false);
  }

  public scope (type?: 'read' | 'manage') {
    // add scope if used
    if (type) {
      addScope(`integrations:${type}`);
    }
    return `integrations:${type ?? 'read'}`;
  }
}

export default Integration;
