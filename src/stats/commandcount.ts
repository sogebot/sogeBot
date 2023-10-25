import { CommandsCount } from '@entity/commands.js';
import { AppDataSource } from '~/database.js';

import Stats from './_interface.js';

import { adminEndpoint } from '~/helpers/socket.js';

class CommandCount extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'commandcount', id: 'stats/commandcount', this: null,
    });
  }

  sockets() {
    adminEndpoint('/stats/commandcount', 'commands::count', async (cb) => {
      try {
        cb(null, await AppDataSource.getRepository(CommandsCount).find());
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
  }
}

export default new CommandCount();
