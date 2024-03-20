import { addScope } from '~/helpers/socket.js';
import Module from '../_interface.js';

class Overlay extends Module {
  constructor() {
    super('stats', true);
  }

  scope () {
    // add scope if used
    addScope('stats:read');
    return 'stats:read';
  }
}

export default Overlay;
