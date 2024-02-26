import Module from '../_interface.js';

import { addScope } from '~/helpers/socket.js';

class Widget extends Module {
  constructor() {
    super('widgets', true);
  }

  scope (type?: 'read' | 'manage') {
    // add scope if used
    if (type) {
      addScope('dashboard:admin:' + (type ?? ''));
    }
    return 'dashboard:admin:' + (type ?? '');
  }
}

export default Widget;
