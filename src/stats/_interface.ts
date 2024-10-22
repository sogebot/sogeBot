import Module from '../_interface.js';

import { addScope } from '~/helpers/socket.js';

class Overlay extends Module {
  constructor() {
    super('stats', true);
  }

  scope() {
    // add scope if used
    addScope('stats:read');
    return 'stats';
  }
}

export default Overlay;
