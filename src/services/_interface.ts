import Module from '../_interface.js';

import { addScope } from '~/helpers/socket.js';

class Service extends Module {
  constructor() {
    super('services', true);
  }

  public scope (type?: 'read' | 'manage') {
    // add scope if used
    if (type) {
      addScope(`services:${type}`);
    }
    return `services:${type ?? 'read'}`;
  }
}

export default Service;
