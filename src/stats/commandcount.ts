import { getRepository } from 'typeorm';

import { CommandsCount } from '../database/entity/commands';
import { adminEndpoint } from '../helpers/socket';
import Stats from './_interface';

class CommandCount extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'commandcount', id: 'stats/commandcount', this: null, 
    });
  }

  sockets() {
    adminEndpoint(this.nsp, 'commands::count', async (cb) => {
      try {
        cb(null, await getRepository(CommandsCount).find());
      } catch (e) {
        cb(e.stack, []);
      }
    });
  }
}

export default new CommandCount();
