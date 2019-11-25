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
      cb(await getRepository(CommandsCount).find());
    });
  }
}

export default new CommandCount();
