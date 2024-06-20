import Module from '../_interface.js';

import { addScope } from '~/helpers/socket.js';

class Widget extends Module {
  constructor() {
    super('widgets', true);
  }

  scope (type?: 'read' | 'manage') {
    // add scope if used
    if (type) {
      addScope('dashboard:' + type);
    }
    return 'dashboard:' + (type ?? '');
  }
}

export default Widget;
