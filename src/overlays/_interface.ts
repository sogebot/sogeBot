import Module from '../_interface.js';

import { addScope } from '~/helpers/socket.js';

class Overlay extends Module {
  constructor() {
    super('overlays', true);
  }

  scope (type?: 'read' | 'manage') {
    // add scope if used
    if (type) {
      addScope('overlay:' + type);
    }
    return 'overlay:' + (type ?? '');
  }
}

export default Overlay;
