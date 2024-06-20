import Module from '../_interface.js';

import { addScope } from '~/helpers/socket.js';

class Game extends Module {
  constructor() {
    super('games', false);
  }

  public scope (type?: 'read' | 'manage') {
    // add scope if used
    if (type) {
      addScope(`games:${type}`);
    }
    return `games:${type ?? 'read'}`;
  }
}

export default Game;
