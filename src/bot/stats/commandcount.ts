import Stats from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { CommandsCount } from '../database/entity/commands';

class CommandCount extends Stats {
  constructor() {
    super();
    this.addMenu({ category: 'stats', name: 'commandcount', id: 'stats/commandcount' });
  }

  sockets() {
    adminEndpoint(this.nsp, 'commands::count', async (cb) => {
      try {
        cb(null, await getRepository(CommandsCount).find());
      } catch (e) {
        cb(e, []);
      }
    });
  }
}

export default new CommandCount();
