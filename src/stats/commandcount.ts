import { CommandsCount } from '@entity/commands.js';

import Stats from './_interface.js';

import { AppDataSource } from '~/database.js';
import { Get } from '~/decorators/endpoint.js';

class CommandCount extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'commandcount', id: 'stats/commandcount', this: null,
    });
  }

  @Get('/')
  async getAll() {
    return await AppDataSource.getRepository(CommandsCount).find();
  }
}

export default new CommandCount();
