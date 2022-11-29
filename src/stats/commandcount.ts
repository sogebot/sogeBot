import { CommandsCount } from '@entity/commands';
import { AppDataSource } from '~/database';

import Stats from './_interface';

import { adminEndpoint } from '~/helpers/socket';

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
